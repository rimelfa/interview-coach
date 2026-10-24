const mysql = require('mysql2/promise');
require('dotenv').config();

async function addRetryTracking() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'interview_coach'
    });

    try {
        console.log('🚀 Adding retry tracking to user_sessions table...');
        
        // Add is_retry boolean column (defaults to 0/false for existing records)
        await connection.execute(`
            ALTER TABLE user_sessions 
            ADD COLUMN is_retry BOOLEAN NOT NULL DEFAULT FALSE 
            AFTER question_text
        `);
        
        console.log('✅ Added is_retry column');
        
        // Add attempt_number column to track which attempt this is (1st, 2nd, etc.)
        await connection.execute(`
            ALTER TABLE user_sessions 
            ADD COLUMN attempt_number INT NOT NULL DEFAULT 1 
            AFTER is_retry
        `);
        
        console.log('✅ Added attempt_number column');
        
        // Add original_question_id to link retries to the original attempt
        await connection.execute(`
            ALTER TABLE user_sessions 
            ADD COLUMN original_question_id INT NULL 
            AFTER attempt_number,
            ADD INDEX idx_original_question (original_question_id),
            ADD FOREIGN KEY (original_question_id) 
            REFERENCES user_sessions(id) ON DELETE SET NULL
        `);
        
        console.log('✅ Added original_question_id column with foreign key');
        
        // Add index for better query performance when filtering by retries
        await connection.execute(`
            CREATE INDEX idx_user_sessions_retry 
            ON user_sessions(user_id, session_uuid, question_number, is_retry, attempt_number)
        `);
        
        console.log('✅ Added index for retry tracking');
        
        console.log('🎉 Migration completed successfully!');
        console.log('📊 All existing records have been marked as is_retry = FALSE and attempt_number = 1');
        console.log('🔄 New retry attempts will be stored as separate rows with is_retry = TRUE');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

// Run migration if called directly
if (require.main === module) {
    addRetryTracking()
        .then(() => {
            console.log('Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = addRetryTracking;