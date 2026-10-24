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

// Makes stripe_payment_intent a database-level safety net against double-crediting —
// the application-level GET_LOCK in stripeService.confirmPayment isn't reliable across
// a connection pool, since named locks are tied to the specific connection that acquired them.
async function addPaymentIntentUniqueConstraints(pool) {
    const connection = await pool.getConnection();

    try {
        for (const table of ['user_subscriptions', 'payment_history']) {
            const [existingIndex] = await connection.execute(
                `SHOW INDEX FROM ${table} WHERE Key_name = 'uniq_stripe_payment_intent'`
            );

            if (existingIndex.length > 0) {
                continue;
            }

            const [duplicates] = await connection.execute(
                `SELECT stripe_payment_intent, COUNT(*) as cnt
                 FROM ${table}
                 WHERE stripe_payment_intent IS NOT NULL
                 GROUP BY stripe_payment_intent
                 HAVING cnt > 1`
            );

            if (duplicates.length > 0) {
                logger.error(`Found ${duplicates.length} duplicate stripe_payment_intent values in ${table} — skipping unique constraint until resolved manually`, { duplicates });
                continue;
            }

            await connection.execute(
                `ALTER TABLE ${table} ADD UNIQUE INDEX uniq_stripe_payment_intent (stripe_payment_intent)`
            );
            logger.info(`Added UNIQUE constraint on stripe_payment_intent to ${table}`);
        }

        return true;
    } catch (error) {
        logger.error('Error adding payment intent unique constraints:', error);
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = { addPaymentIntentUniqueConstraints };
