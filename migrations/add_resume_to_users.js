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

async function addResumeToUsers() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306,
            ssl: {
                rejectUnauthorized: false
            }
        });

        logger.info('Adding resume fields to users table...');

        // Check if resume_content column already exists
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'resume_content'
        `, [process.env.DB_NAME]);

        if (columns.length === 0) {
            // Add resume fields to users table
            await connection.execute(`
                ALTER TABLE users 
                ADD COLUMN resume_content LONGTEXT NULL,
                ADD COLUMN resume_filename VARCHAR(255) NULL,
                ADD COLUMN resume_uploaded_at TIMESTAMP NULL
            `);
            logger.info('✅ Successfully added resume fields to users table');
        } else {
            logger.info('Resume fields already exist in users table');
        }

    } catch (error) {
        logger.error('Error adding resume fields to users table:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

module.exports = addResumeToUsers;

// Run migration if called directly
if (require.main === module) {
    require('dotenv').config();
    addResumeToUsers()
        .then(() => {
            console.log('Migration completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}