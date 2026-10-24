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

async function createUserInterviewProgressTable(pool) {
    try {
        logger.info('🔨 Starting creation of user_interview_progress table...');
        
        const connection = await pool.getConnection();
        
        // First check if table already exists
        const [tables] = await connection.execute(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_interview_progress'`
        );
        
        if (tables.length > 0) {
            logger.info('✅ user_interview_progress table already exists');
            connection.release();
            return true;
        }
        
        // Create comprehensive user_interview_progress table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS user_interview_progress (
                id INT AUTO_INCREMENT PRIMARY KEY,
                
                -- User and session info
                user_id INT NOT NULL,
                session_id INT,
                question_number INT NOT NULL,
                
                -- Interview configuration
                current_role VARCHAR(255),
                experience_years VARCHAR(50),
                detected_role VARCHAR(255),
                detected_company VARCHAR(255),
                detected_industry VARCHAR(255),
                difficulty_level VARCHAR(50),
                question_type VARCHAR(100),
                language VARCHAR(50),
                company_name VARCHAR(255),
                additional_info TEXT,
                
                -- Question and answer
                question_text TEXT NOT NULL,
                answer_text TEXT,
                answer_mode ENUM('voice', 'text') DEFAULT 'text',
                answer_duration INT DEFAULT 0,
                
                -- Scoring
                score DECIMAL(3,1),
                score_comparison TEXT,
                
                -- Feedback components
                strengths TEXT,
                improvements TEXT,
                better_response TEXT,
                tips TEXT,
                full_feedback TEXT,
                
                -- Metadata
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                -- Foreign keys
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (session_id) REFERENCES interview_sessions(id) ON DELETE SET NULL,
                
                -- Indexes for performance
                INDEX idx_user_id (user_id),
                INDEX idx_session_id (session_id),
                INDEX idx_created_at (created_at),
                INDEX idx_score (score),
                INDEX idx_difficulty (difficulty_level),
                INDEX idx_question_type (question_type)
            )
        `);
        
        logger.info('user_interview_progress table created successfully');
        
        // Note: practice_answers table is deprecated - using user_interview_progress instead
        
        connection.release();
        logger.info('Migration completed successfully!');
        
        return true;
    } catch (error) {
        logger.error('Error creating user_interview_progress table:', error);
        throw error;
    }
}

module.exports = { createUserInterviewProgressTable };