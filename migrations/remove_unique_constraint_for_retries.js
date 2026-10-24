const mysql = require('mysql2/promise');
require('dotenv').config();

async function removeUniqueConstraintForRetries() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'interview_coach'
    });

    try {
        console.log('🚀 Removing unique constraint that blocks retries...');
        
        // First, check what indexes/constraints exist
        const [indexes] = await connection.execute(`
            SHOW INDEX FROM user_sessions 
            WHERE Key_name = 'unique_session_question'
        `);
        
        if (indexes.length > 0) {
            console.log('✅ Found unique_session_question constraint');
            
            // Drop the unique constraint that's blocking retries
            await connection.execute(`
                ALTER TABLE user_sessions 
                DROP INDEX unique_session_question
            `);
            
            console.log('✅ Removed unique_session_question constraint');
            
            // Add a new unique constraint that includes attempt_number
            // This ensures uniqueness per attempt, not per question
            await connection.execute(`
                ALTER TABLE user_sessions 
                ADD UNIQUE KEY unique_session_question_attempt (session_uuid, question_number, attempt_number)
            `);
            
            console.log('✅ Added new unique constraint that allows retries (unique per attempt)');
        } else {
            console.log('⚠️ unique_session_question constraint not found - checking for other constraints');
            
            // Show all indexes to help debug
            const [allIndexes] = await connection.execute(`
                SHOW INDEX FROM user_sessions
            `);
            
            console.log('Current indexes on user_sessions:');
            allIndexes.forEach(idx => {
                console.log(`  - ${idx.Key_name} on column ${idx.Column_name} (Unique: ${idx.Non_unique === 0})`);
            });
        }
        
        console.log('🎉 Migration completed successfully!');
        console.log('✨ Retries can now be saved as separate rows');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

// Run migration if called directly
if (require.main === module) {
    removeUniqueConstraintForRetries()
        .then(() => {
            console.log('Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = removeUniqueConstraintForRetries;