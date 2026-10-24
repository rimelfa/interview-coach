const mysql = require('mysql2/promise');
const winston = require('winston');
// Legacy migration imports removed - tables cleaned up
const { createUnifiedSessionTable, migrateExistingData } = require('../migrations/create_unified_session_table');
const { addPaymentTrackingColumns } = require('../migrations/add_payment_tracking');
const { addOldAvgScoreToUserProgress } = require('../migrations/add_old_avg_score_to_user_progress');
const { addPaymentIntentUniqueConstraints } = require('../migrations/add_payment_intent_unique_constraint');
const { addQuestionUsageMode } = require('../migrations/add_question_usage_mode');

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

// Create connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Test database connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        await connection.ping();
        logger.info('Database connection successful');
        connection.release();
        return true;
    } catch (error) {
        logger.error('Database connection failed:', error);
        return false;
    }
}

// Initialize database tables
async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();
        
        // Create users table if not exists
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255),
                name VARCHAR(255),
                phone VARCHAR(20),
                country VARCHAR(100),
                company VARCHAR(255),
                role VARCHAR(100),
                experience_years INT,
                is_verified BOOLEAN DEFAULT FALSE,
                verification_token VARCHAR(255),
                reset_token VARCHAR(255),
                reset_token_expires TIMESTAMP NULL,
                last_login TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Check if the users table needs to be updated with new authentication columns
        try {
            // Try to describe the existing table structure
            const [columns] = await connection.execute('DESCRIBE users');
            const columnNames = columns.map(col => col.Field);

            // Add missing columns
            if (!columnNames.includes('password_hash')) {
                await connection.execute('ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)');
                logger.info('Added password_hash column to users table');
            }
            if (!columnNames.includes('phone')) {
                await connection.execute('ALTER TABLE users ADD COLUMN phone VARCHAR(20)');
                logger.info('Added phone column to users table');
            }
            if (!columnNames.includes('country')) {
                await connection.execute('ALTER TABLE users ADD COLUMN country VARCHAR(100)');
                logger.info('Added country column to users table');
            }
            if (!columnNames.includes('company')) {
                await connection.execute('ALTER TABLE users ADD COLUMN company VARCHAR(255)');
                logger.info('Added company column to users table');
            }
            if (!columnNames.includes('role')) {
                await connection.execute('ALTER TABLE users ADD COLUMN role VARCHAR(100)');
                logger.info('Added role column to users table');
            }
            if (!columnNames.includes('experience_years')) {
                await connection.execute('ALTER TABLE users ADD COLUMN experience_years INT');
                logger.info('Added experience_years column to users table');
            }
            if (!columnNames.includes('is_verified')) {
                await connection.execute('ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE');
                logger.info('Added is_verified column to users table');
            }
            if (!columnNames.includes('verification_token')) {
                await connection.execute('ALTER TABLE users ADD COLUMN verification_token VARCHAR(255)');
                logger.info('Added verification_token column to users table');
            }
            if (!columnNames.includes('reset_token')) {
                await connection.execute('ALTER TABLE users ADD COLUMN reset_token VARCHAR(255)');
                logger.info('Added reset_token column to users table');
            }
            if (!columnNames.includes('reset_token_expires')) {
                await connection.execute('ALTER TABLE users ADD COLUMN reset_token_expires TIMESTAMP NULL');
                logger.info('Added reset_token_expires column to users table');
            }
            if (!columnNames.includes('last_login')) {
                await connection.execute('ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL');
                logger.info('Added last_login column to users table');
            }
            
            // Make password_hash NOT NULL after adding it (for new records)
            if (!columnNames.includes('password_hash')) {
                // Update the column to be NOT NULL for future records, but allow existing records to be NULL
                await connection.execute('ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255)');
            }
            
        } catch (alterError) {
            logger.error('Error checking/updating users table structure:', alterError);
            // Don't throw - continue with table creation
        }

        // Create packages table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS packages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                questions_per_month INT NOT NULL,
                price_gbp DECIMAL(10,2) NOT NULL,
                duration_months INT DEFAULT 1,
                billing_period ENUM('monthly', 'annual') DEFAULT 'monthly',
                is_popular BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Insert default packages if they don't exist
        await connection.execute(`
            INSERT IGNORE INTO packages (id, name, description, questions_per_month, price_gbp, duration_months, is_popular, is_active) VALUES
            (1, 'Basic', 'Perfect for getting started with interview practice', 50, 6.99, 1, FALSE, TRUE),
            (2, 'Plus', 'Most popular choice for serious job seekers', 100, 10.99, 2, TRUE, TRUE)
        `);

        // Update existing packages with new pricing and duration (for existing databases)
        await connection.execute(`
            UPDATE packages 
            SET name = 'Basic', price_gbp = 6.99, questions_per_month = 50, duration_months = 1 
            WHERE id = 1
        `);
        
        await connection.execute(`
            UPDATE packages 
            SET name = 'Plus', price_gbp = 10.99, questions_per_month = 100, duration_months = 2 
            WHERE id = 2
        `);

        // Create user_subscriptions table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS user_subscriptions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                package_id INT NOT NULL,
                stripe_subscription_id VARCHAR(255),
                stripe_customer_id VARCHAR(255),
                status ENUM('active', 'inactive', 'cancelled', 'past_due') DEFAULT 'inactive',
                questions_used INT DEFAULT 0,
                questions_remaining INT DEFAULT 0,
                current_period_start TIMESTAMP NULL,
                current_period_end TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE RESTRICT,
                UNIQUE KEY unique_active_subscription (user_id, status)
            )
        `);

        // Legacy tables removed - now using unified user_sessions table
        // practice_sessions, interview_sessions, practice_questions have been migrated to user_sessions
        
        // Create question_usage table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS question_usage (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                subscription_id INT,
                practice_session_id INT,
                question_count INT DEFAULT 1,
                usage_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expiry_date DATE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(id) ON DELETE SET NULL
                -- Removed foreign key to practice_sessions as that table is deprecated
            )
        `);

        // Legacy table creation removed - data migrated to user_sessions

        // Store tester job titles
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS tester_job_titles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                job_title VARCHAR(255) NOT NULL,
                normalized_title VARCHAR(255),
                difficulty_level VARCHAR(50),
                question_type VARCHAR(100),
                language VARCHAR(50),
                has_additional_info TINYINT(1) DEFAULT 0,
                additional_info_length INT DEFAULT 0,
                question_text TEXT,
                answer_text TEXT,
                source ENUM('tester') DEFAULT 'tester',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_tester_job_titles_user (user_id),
                INDEX idx_tester_job_titles_created (created_at),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Backfill missing tester_job_titles columns if the table already exists
        try {
            const [testerColumns] = await connection.execute('DESCRIBE tester_job_titles');
            const testerColumnNames = testerColumns.map(col => col.Field);

            if (!testerColumnNames.includes('difficulty_level')) {
                await connection.execute('ALTER TABLE tester_job_titles ADD COLUMN difficulty_level VARCHAR(50)');
            }
            if (!testerColumnNames.includes('question_type')) {
                await connection.execute('ALTER TABLE tester_job_titles ADD COLUMN question_type VARCHAR(100)');
            }
            if (!testerColumnNames.includes('language')) {
                await connection.execute('ALTER TABLE tester_job_titles ADD COLUMN language VARCHAR(50)');
            }
            if (!testerColumnNames.includes('has_additional_info')) {
                await connection.execute('ALTER TABLE tester_job_titles ADD COLUMN has_additional_info TINYINT(1) DEFAULT 0');
            }
            if (!testerColumnNames.includes('additional_info_length')) {
                await connection.execute('ALTER TABLE tester_job_titles ADD COLUMN additional_info_length INT DEFAULT 0');
            }
            if (!testerColumnNames.includes('question_text')) {
                await connection.execute('ALTER TABLE tester_job_titles ADD COLUMN question_text TEXT');
            }
            if (!testerColumnNames.includes('answer_text')) {
                await connection.execute('ALTER TABLE tester_job_titles ADD COLUMN answer_text TEXT');
            }
        } catch (alterError) {
            logger.error('Error checking/updating tester_job_titles table structure:', alterError);
        }


        // Create user_progress table for aggregated stats
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS user_progress (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                total_sessions INT DEFAULT 0,
                total_practice_questions INT DEFAULT 0,
                avg_score DECIMAL(3,1),
                old_avg_score DECIMAL(3,1),
                best_score DECIMAL(3,1),
                improvement_rate DECIMAL(5,2),
                last_session_date TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user (user_id)
            )
        `);

        connection.release();
        
        // Legacy practice table migration disabled - tables already cleaned up
        // The migratePracticeTables migration is disabled as legacy tables have been removed
        
        // Legacy user_interview_progress table migration disabled - data migrated to user_sessions
        // The createUserInterviewProgressTable migration is disabled as this table is deprecated
        
        // Run migration to create unified session table
        try {
            await createUnifiedSessionTable(pool);
            await migrateExistingData(pool);
        } catch (migrationError) {
            logger.error('Unified session migration error (non-fatal):', migrationError);
            // Don't fail initialization if migration fails - it might have already been run
        }
        
        // Run migration to add payment tracking columns
        try {
            await addPaymentTrackingColumns(pool);
        } catch (migrationError) {
            logger.error('Payment tracking migration error (non-fatal):', migrationError);
            // Don't fail initialization if migration fails - it might have already been run
        }

        // Run migration to add old_avg_score to user_progress
        try {
            await addOldAvgScoreToUserProgress(pool);
        } catch (migrationError) {
            logger.error('User progress migration error (non-fatal):', migrationError);
            // Don't fail initialization if migration fails - it might have already been run
        }

        // Run migration to add a unique constraint on stripe_payment_intent
        try {
            await addPaymentIntentUniqueConstraints(pool);
        } catch (migrationError) {
            logger.error('Payment intent unique constraint migration error (non-fatal):', migrationError);
            // Don't fail initialization if migration fails - it might have already been run
        }

        // Run migration to add mode column to question_usage (practice vs simulate trial credit)
        try {
            await addQuestionUsageMode(pool);
        } catch (migrationError) {
            logger.error('Question usage mode migration error (non-fatal):', migrationError);
            // Don't fail initialization if migration fails - it might have already been run
        }

        logger.info('Database tables initialized successfully');
        return true;
    } catch (error) {
        logger.error('Error initializing database:', error);
        return false;
    }
}


module.exports = {
    pool,
    testConnection,
    initializeDatabase
};
