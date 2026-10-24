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

async function addPaymentTrackingColumns(pool) {
    const connection = await pool.getConnection();
    
    try {
        // Add Stripe customer ID to users table
        const [userColumns] = await connection.execute('DESCRIBE users');
        const userColumnNames = userColumns.map(col => col.Field);
        
        if (!userColumnNames.includes('stripe_customer_id')) {
            await connection.execute(`
                ALTER TABLE users 
                ADD COLUMN stripe_customer_id VARCHAR(255) UNIQUE,
                ADD COLUMN has_active_subscription BOOLEAN DEFAULT FALSE,
                ADD COLUMN last_payment_date TIMESTAMP NULL
            `);
            logger.info('Added payment tracking columns to users table');
        }
        
        // Update user_subscriptions table with additional Stripe fields
        const [subColumns] = await connection.execute('DESCRIBE user_subscriptions');
        const subColumnNames = subColumns.map(col => col.Field);
        
        if (!subColumnNames.includes('stripe_payment_intent')) {
            await connection.execute(`
                ALTER TABLE user_subscriptions 
                ADD COLUMN stripe_payment_intent VARCHAR(255),
                ADD COLUMN stripe_session_id VARCHAR(255),
                ADD COLUMN amount_paid_gbp DECIMAL(10,2),
                ADD INDEX idx_stripe_session (stripe_session_id),
                ADD INDEX idx_user_status (user_id, status)
            `);
            logger.info('Added Stripe payment fields to user_subscriptions table');
        }
        
        // Modify the unique constraint on user_subscriptions
        try {
            await connection.execute(`
                ALTER TABLE user_subscriptions 
                DROP INDEX unique_active_subscription
            `);
        } catch (e) {
            // Index might not exist
        }
        
        // Create payment_history table for tracking all payments
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS payment_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                subscription_id INT,
                stripe_payment_intent VARCHAR(255),
                stripe_session_id VARCHAR(255),
                amount_gbp DECIMAL(10,2) NOT NULL,
                currency VARCHAR(3) DEFAULT 'GBP',
                payment_status ENUM('pending', 'succeeded', 'failed', 'refunded') DEFAULT 'pending',
                payment_method VARCHAR(50),
                package_name VARCHAR(100),
                questions_granted INT,
                receipt_url TEXT,
                invoice_pdf TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(id) ON DELETE SET NULL,
                INDEX idx_user_payments (user_id),
                INDEX idx_payment_status (payment_status),
                INDEX idx_stripe_pi (stripe_payment_intent)
            )
        `);
        logger.info('Created payment_history table');
        
        // usage_analytics table creation removed - not needed for current system
        
        logger.info('Payment tracking migration completed successfully');
        return true;
        
    } catch (error) {
        logger.error('Error in payment tracking migration:', error);
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = { addPaymentTrackingColumns };