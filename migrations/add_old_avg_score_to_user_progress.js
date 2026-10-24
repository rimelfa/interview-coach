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

async function addOldAvgScoreToUserProgress(pool) {
    const connection = await pool.getConnection();

    try {
        const [columns] = await connection.execute('DESCRIBE user_progress');
        const columnNames = columns.map(col => col.Field);

        if (!columnNames.includes('old_avg_score')) {
            await connection.execute(
                'ALTER TABLE user_progress ADD COLUMN old_avg_score DECIMAL(3,1) AFTER avg_score'
            );
            logger.info('Added old_avg_score column to user_progress table');
        }

        return true;
    } catch (error) {
        logger.error('Error adding old_avg_score to user_progress:', error);
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = { addOldAvgScoreToUserProgress };
