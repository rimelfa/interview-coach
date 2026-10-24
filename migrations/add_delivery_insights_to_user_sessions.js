const mysql = require('mysql2/promise');
require('dotenv').config();

async function addDeliveryInsights() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'interview_coach'
    });

    try {
        console.log('🚀 Adding delivery insights columns to user_sessions table...');

        await connection.execute(`
            ALTER TABLE user_sessions
            ADD COLUMN wpm INT NULL AFTER answer_duration,
            ADD COLUMN word_count INT NULL AFTER wpm,
            ADD COLUMN filler_count INT NULL AFTER word_count,
            ADD COLUMN pause_count INT NULL AFTER filler_count,
            ADD COLUMN longest_pause_ms INT NULL AFTER pause_count
        `);

        console.log('✅ Added wpm, word_count, filler_count, pause_count, longest_pause_ms columns');
        console.log('🎉 Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

if (require.main === module) {
    addDeliveryInsights()
        .then(() => {
            console.log('Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = addDeliveryInsights;
