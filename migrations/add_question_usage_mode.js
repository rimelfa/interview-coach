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

// Lets free-trial credit be split into separate practice/simulate allowances.
// NULL means the shared paid pool (usable by either mode), unchanged for paying users.
async function addQuestionUsageMode(pool) {
    const connection = await pool.getConnection();

    try {
        const [columns] = await connection.execute('DESCRIBE question_usage');
        const columnNames = columns.map(col => col.Field);

        if (!columnNames.includes('mode')) {
            await connection.execute(`
                ALTER TABLE question_usage
                ADD COLUMN mode VARCHAR(20) NULL DEFAULT NULL
            `);
            logger.info('Added mode column to question_usage table');
        }

        // Free trial package's questions_per_month/description are stale now that the
        // trial grants 1 practice + 1 simulate question (2 total) instead of 3 shared.
        await connection.execute(`
            UPDATE packages
            SET questions_per_month = 2,
                description = 'Try Good Chat with 1 free practice question and 1 free simulate question'
            WHERE id = 3 AND questions_per_month = 3
        `);

        return true;
    } catch (error) {
        logger.error('Error adding question_usage mode column:', error);
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = { addQuestionUsageMode };
