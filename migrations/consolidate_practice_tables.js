const mysql = require('mysql2/promise');
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console()
    ]
});

async function migratePracticeTables(pool) {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        logger.info('Starting migration to consolidate practice tables...');
        
        // Step 1: Create new practice_answers table with all columns
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS practice_answers_new (
                id INT AUTO_INCREMENT PRIMARY KEY,
                session_id INT NOT NULL,
                user_id INT NOT NULL,
                question_number INT NOT NULL,
                question_text TEXT NOT NULL,
                question_type VARCHAR(100),
                answer_text TEXT NOT NULL,
                score DECIMAL(3,1),
                feedback TEXT,
                attempt_number INT DEFAULT 1,
                answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_session_id (session_id)
            )
        `);
        
        // Step 2: Check if old tables exist
        const [tables] = await connection.execute(
            "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('practice_questions', 'practice_answers')"
        );
        
        if (tables.length > 0) {
            // Step 3: Check table structure and migrate existing data
            logger.info('Migrating existing data...');
            
            try {
                // Check if both required tables actually exist
                const tableNames = tables.map(t => t.TABLE_NAME);
                const hasPracticeAnswers = tableNames.includes('practice_answers');
                const hasPracticeQuestions = tableNames.includes('practice_questions');
                
                if (!hasPracticeAnswers || !hasPracticeQuestions) {
                    logger.info('One or both required tables missing, skipping migration');
                    await connection.commit();
                    connection.release();
                    return true;
                }
                
                // Check if the old tables have the expected structure
                const [practiceAnswersStructure] = await connection.execute(`
                    SHOW COLUMNS FROM practice_answers
                `);
                
                const [practiceQuestionsStructure] = await connection.execute(`
                    SHOW COLUMNS FROM practice_questions
                `);
                
                const hasQuestionId = practiceAnswersStructure.some(col => col.Field === 'question_id');
                const hasSessionId = practiceQuestionsStructure.some(col => col.Field === 'session_id');
                
                if (hasQuestionId && hasSessionId) {
                    // Original structure - migrate with JOIN
                    await connection.execute(`
                        INSERT INTO practice_answers_new (
                            session_id, user_id, question_number, question_text, question_type,
                            answer_text, score, feedback, attempt_number, answered_at
                        )
                        SELECT 
                            pq.session_id,
                            s.user_id,
                            pq.question_number,
                            pq.question_text,
                            pq.question_type,
                            pa.answer_text,
                            pa.score,
                            pa.feedback,
                            COALESCE(pa.attempt_number, 1),
                            COALESCE(pa.answered_at, NOW())
                        FROM practice_answers pa
                        JOIN practice_questions pq ON pa.question_id = pq.id
                        JOIN interview_sessions s ON pq.session_id = s.id
                        WHERE s.user_id IS NOT NULL
                    `);
                } else {
                    // If structure is different, skip migration or handle differently
                    logger.info('Table structure not as expected, skipping data migration');
                }
                
                logger.info('Data migration completed');
                
                // Step 4: Drop old tables
                await connection.execute('DROP TABLE IF EXISTS practice_answers');
                await connection.execute('DROP TABLE IF EXISTS practice_questions');
            } catch (migrationError) {
                logger.error('Error during data migration:', migrationError);
                // Continue with table drops even if migration fails
                try {
                    await connection.execute('DROP TABLE IF EXISTS practice_answers');
                    await connection.execute('DROP TABLE IF EXISTS practice_questions');
                } catch (dropError) {
                    logger.error('Error dropping old tables:', dropError);
                }
            }
        }
        
        // Step 5: Rename new table
        await connection.execute('DROP TABLE IF EXISTS practice_answers');
        await connection.execute('ALTER TABLE practice_answers_new RENAME TO practice_answers');
        
        await connection.commit();
        logger.info('Migration completed successfully!');
        
    } catch (error) {
        await connection.rollback();
        logger.error('Migration failed:', error);
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    migratePracticeTables
};