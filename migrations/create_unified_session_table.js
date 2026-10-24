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

async function createUnifiedSessionTable(pool) {
    try {
        logger.info('🔨 Creating unified user_sessions table...');
        
        const connection = await pool.getConnection();
        
        // Create the master unified table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                
                -- User and subscription info
                user_id INT NOT NULL,
                subscription_id INT,
                
                -- Session metadata
                session_type ENUM('practice_mode', 'tester', 'full') NOT NULL DEFAULT 'practice_mode',
                session_uuid VARCHAR(36),  -- For grouping questions in multi-question sessions
                question_number INT DEFAULT 1,  -- Position in session (1 for single questions)
                total_questions INT DEFAULT 1,  -- Total questions in session
                
                -- Interview configuration
                current_role VARCHAR(255),
                experience_years VARCHAR(50),
                detected_role VARCHAR(255),
                detected_company VARCHAR(255),
                detected_industry VARCHAR(255),
                difficulty_level VARCHAR(50) DEFAULT 'intermediate',
                question_type VARCHAR(100),
                language VARCHAR(50) DEFAULT 'english',
                company_name VARCHAR(255),
                additional_info TEXT,
                target_role VARCHAR(255),  -- From practice_sessions
                industry VARCHAR(100),     -- From practice_sessions
                
                -- Content
                job_description TEXT,
                resume_content TEXT,
                question_text TEXT,  -- Allow NULL for session containers
                answer_text TEXT,
                answer_mode ENUM('voice', 'text') DEFAULT 'text',
                answer_duration INT DEFAULT 0,
                
                -- AI Feedback
                score DECIMAL(3,1),
                score_comparison TEXT,
                ai_feedback TEXT,           -- Full feedback text
                confidence_score INT,       -- From practice_sessions
                strengths TEXT,             -- Parsed strengths
                improvements TEXT,          -- Parsed improvements  
                better_response TEXT,       -- Parsed better response
                tips TEXT,                  -- Parsed tips
                improvement_areas JSON,     -- From practice_sessions (legacy)
                strengths_identified JSON,  -- From practice_sessions (legacy)
                suggested_improvements JSON,-- From practice_sessions (legacy)
                interview_tips JSON,       -- From practice_sessions (legacy)
                
                -- Session tracking
                session_duration INT DEFAULT 0,
                started_at TIMESTAMP NULL,
                ended_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                -- Foreign keys
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(id) ON DELETE SET NULL,
                
                -- Indexes for performance
                INDEX idx_user_id (user_id),
                INDEX idx_session_uuid (session_uuid),
                INDEX idx_session_type (session_type),
                INDEX idx_created_at (created_at),
                INDEX idx_score (score),
                INDEX idx_difficulty (difficulty_level),
                INDEX idx_question_type (question_type),
                
                -- Unique constraint for session grouping
                UNIQUE KEY unique_session_question (session_uuid, question_number)
            )
        `);
        
        logger.info('✅ user_sessions table created successfully');
        
        // Fix existing table if question_text is NOT NULL
        try {
            await connection.execute(`
                ALTER TABLE user_sessions 
                MODIFY COLUMN question_text TEXT NULL
            `);
            logger.info('✅ Fixed question_text column to allow NULL values');
        } catch (alterError) {
            logger.info('question_text column already allows NULL or modification not needed');
        }
        
        connection.release();
        
        return true;
    } catch (error) {
        logger.error('❌ Error creating unified session table:', error);
        throw error;
    }
}

async function migrateExistingData(pool) {
    try {
        logger.info('📦 Migrating existing session data...');
        
        const connection = await pool.getConnection();
        
        // Check if legacy tables exist before migrating
        const [tables] = await connection.execute(`
            SELECT TABLE_NAME FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME IN ('user_interview_progress', 'practice_sessions')
        `);
        
        const existingTables = tables.map(t => t.TABLE_NAME);
        
        // Migrate from user_interview_progress if it exists
        if (existingTables.includes('user_interview_progress')) {
            logger.info('📦 Migrating from user_interview_progress...');
            await connection.execute(`
                INSERT IGNORE INTO user_sessions (
                    user_id, session_uuid, session_type, question_number,
                    current_role, experience_years, detected_role, detected_company, 
                    detected_industry, difficulty_level, question_type, language,
                    company_name, additional_info, job_description, 
                    question_text, answer_text, answer_mode, answer_duration,
                    score, score_comparison, ai_feedback, strengths, improvements, 
                    better_response, tips, created_at, updated_at
                )
                SELECT 
                    user_id, 
                    CONCAT('session-', session_id) as session_uuid,
                    'practice_mode' as session_type,
                    question_number,
                    current_role, experience_years, detected_role, detected_company,
                    detected_industry, difficulty_level, question_type, language,
                    company_name, additional_info, '' as job_description,
                    question_text, answer_text, answer_mode, answer_duration,
                    score, score_comparison, full_feedback as ai_feedback, 
                    strengths, improvements, better_response, tips,
                    created_at, updated_at
                FROM user_interview_progress
            `);
            logger.info('✅ user_interview_progress migration completed');
        } else {
            logger.info('⏭️ user_interview_progress table not found, skipping migration');
        }
        
        // Migrate from practice_sessions if it exists
        if (existingTables.includes('practice_sessions')) {
            logger.info('📦 Migrating from practice_sessions...');
            await connection.execute(`
                INSERT IGNORE INTO user_sessions (
                    user_id, subscription_id, session_uuid, session_type, question_number,
                    target_role, industry, job_description, resume_content,
                    question_text, answer_text, score, ai_feedback, confidence_score,
                    improvement_areas, strengths_identified, suggested_improvements, 
                    interview_tips, session_duration, created_at, updated_at
                )
                SELECT 
                    user_id, subscription_id,
                    CONCAT('practice-', id) as session_uuid,
                    session_type, 1 as question_number,
                    target_role, industry, job_description, resume_content,
                    question_text, user_response as answer_text,
                    confidence_score as score, ai_feedback, confidence_score,
                    improvement_areas, strengths_identified, suggested_improvements,
                    interview_tips, session_duration, created_at, updated_at
                FROM practice_sessions
                WHERE question_text IS NOT NULL
            `);
            logger.info('✅ practice_sessions migration completed');
        } else {
            logger.info('⏭️ practice_sessions table not found, skipping migration');
        }
        
        logger.info('✅ Data migration completed successfully');
        connection.release();
        
        return true;
    } catch (error) {
        logger.error('❌ Error migrating session data:', error);
        throw error;
    }
}

module.exports = { 
    createUnifiedSessionTable,
    migrateExistingData
};