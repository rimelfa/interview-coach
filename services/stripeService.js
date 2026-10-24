const { pool } = require('../config/database');
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

class StripeService {
    constructor() {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
        if (!secretKey || !publishableKey) {
            throw new Error('STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY must be set in the environment — refusing to fall back to a hardcoded key');
        }
        if (secretKey.startsWith('sk_test_') !== publishableKey.startsWith('pk_test_')) {
            throw new Error('STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY are from different modes (one test, one live)');
        }
        this.stripe = require('stripe')(secretKey);
        this.publishableKey = publishableKey;
        // Multi-currency pricing structure
        this.currencyPricing = {
            GBP: { basic: 699, plus: 1099 },     // £6.99, £10.99
            USD: { basic: 899, plus: 1399 },     // $8.99, $13.99
            EUR: { basic: 799, plus: 1299 },     // €7.99, €12.99
            CAD: { basic: 1199, plus: 1899 },    // C$11.99, C$18.99
            AUD: { basic: 1299, plus: 1999 }     // A$12.99, A$19.99
        };
        
        this.priceIds = {};  // Will store currency-specific price IDs
        this.productIds = {}; // Will store currency-specific product IDs
        // Initialize products on startup
        this.initializeProducts();
    }

    /**
     * Initialize Stripe products and prices for all currencies
     */
    async initializeProducts() {
        try {
            const currencies = Object.keys(this.currencyPricing);
            
            for (const currency of currencies) {
                logger.info(`Initializing products for ${currency}...`);
                
                // Initialize structure for this currency
                this.productIds[currency] = {};
                this.priceIds[currency] = {};
                
                // Create Basic package for this currency
                const basicProduct = await this.getOrCreateProduct(
                    `interview-coach-basic-${currency.toLowerCase()}`,
                    `Good Chat - Basic Package (${currency})`,
                    `50 interview questions with AI feedback and progress tracking - ${currency} pricing`
                );
                
                const basicPrice = await this.getOrCreatePrice(
                    basicProduct.id,
                    this.currencyPricing[currency].basic,
                    currency.toLowerCase(),
                    `interview-coach-basic-price-${currency.toLowerCase()}`
                );
                
                this.productIds[currency].basic = basicProduct.id;
                this.priceIds[currency].basic = basicPrice.id;
                
                // Create Plus package for this currency
                const plusProduct = await this.getOrCreateProduct(
                    `interview-coach-plus-${currency.toLowerCase()}`,
                    `Good Chat - Plus Package (${currency})`,
                    `100 interview questions with premium AI feedback and advanced analytics - ${currency} pricing`
                );
                
                const plusPrice = await this.getOrCreatePrice(
                    plusProduct.id,
                    this.currencyPricing[currency].plus,
                    currency.toLowerCase(),
                    `interview-coach-plus-price-${currency.toLowerCase()}`
                );
                
                this.productIds[currency].plus = plusProduct.id;
                this.priceIds[currency].plus = plusPrice.id;
            }
            
            logger.info('All Stripe products initialized for currencies:', currencies);
            
        } catch (error) {
            logger.error('Error initializing Stripe products:', error);
        }
    }
    
    /**
     * Get or create a Stripe product
     */
    async getOrCreateProduct(productId, name, description) {
        try {
            // Try to retrieve existing product
            const existingProducts = await this.stripe.products.list({
                limit: 100
            });
            
            const existingProduct = existingProducts.data.find(p => p.metadata?.productId === productId);
            if (existingProduct) {
                return existingProduct;
            }
            
            // Create new product
            const product = await this.stripe.products.create({
                name: name,
                description: description,
                metadata: {
                    productId: productId
                }
            });
            
            logger.info(`Created Stripe product: ${product.id} (${name})`);
            return product;
        } catch (error) {
            logger.error('Error creating product:', error);
            throw error;
        }
    }
    
    /**
     * Get or create a Stripe price
     */
    async getOrCreatePrice(productId, unitAmount, currency, priceId) {
        try {
            // Try to find existing price
            const existingPrices = await this.stripe.prices.list({
                product: productId,
                limit: 100
            });
            
            const existingPrice = existingPrices.data.find(p => 
                p.unit_amount === unitAmount && 
                p.currency === currency &&
                p.metadata?.priceId === priceId
            );
            if (existingPrice) {
                return existingPrice;
            }
            
            // Create new price
            const price = await this.stripe.prices.create({
                product: productId,
                unit_amount: unitAmount,
                currency: currency,
                metadata: {
                    priceId: priceId
                }
            });
            
            logger.info(`Created Stripe price: ${price.id} (${unitAmount/100} ${currency.toUpperCase()})`);
            return price;
        } catch (error) {
            logger.error('Error creating price:', error);
            throw error;
        }
    }

    /**
     * Create a Stripe customer for a user
     */
    async createCustomer(user) {
        try {
            const customer = await this.stripe.customers.create({
                email: user.email,
                name: user.name,
                metadata: {
                    userId: user.id.toString()
                }
            });

            // Update user record with Stripe customer ID
            await pool.execute(
                'UPDATE users SET stripe_customer_id = ? WHERE id = ?',
                [customer.id, user.id]
            );

            logger.info(`Stripe customer created for user ${user.id}: ${customer.id}`);
            return customer;
        } catch (error) {
            logger.error('Error creating Stripe customer:', error);
            throw error;
        }
    }

    /**
     * Get or create Stripe customer for a user
     */
    async getOrCreateCustomer(user) {
        try {
            // Check if user already has a Stripe customer ID
            const [users] = await pool.execute(
                'SELECT stripe_customer_id FROM users WHERE id = ?',
                [user.id]
            );

            if (users[0]?.stripe_customer_id) {
                try {
                    // Retrieve existing customer from Stripe
                    const customer = await this.stripe.customers.retrieve(users[0].stripe_customer_id);
                    return customer;
                } catch (stripeError) {
                    // If customer doesn't exist (e.g., test customer ID in live mode), clear it and create new
                    if (stripeError.code === 'resource_missing') {
                        logger.warn(`Clearing invalid Stripe customer ID for user ${user.id}: ${users[0].stripe_customer_id}`);
                        await pool.execute(
                            'UPDATE users SET stripe_customer_id = NULL WHERE id = ?',
                            [user.id]
                        );
                        // Continue to create new customer
                    } else {
                        throw stripeError;
                    }
                }
            }

            // Create new customer
            return await this.createCustomer(user);
        } catch (error) {
            logger.error('Error getting/creating Stripe customer:', error);
            throw error;
        }
    }

    /**
     * Create a custom UI checkout session (embedded components)
     */
    async createCustomCheckoutSession(userId, packageId, currency = 'GBP') {
        try {
            // Get user details
            const [users] = await pool.execute(
                'SELECT * FROM users WHERE id = ?',
                [userId]
            );

            if (!users.length) {
                throw new Error('User not found');
            }

            const user = users[0];

            // Get package details including duration
            const [packages] = await pool.execute(
                'SELECT * FROM packages WHERE id = ? AND is_active = TRUE',
                [packageId]
            );

            if (!packages.length) {
                throw new Error('Package not found');
            }

            const packageData = packages[0];
            const durationMonths = packageData.duration_months || 1;

            // Get or create Stripe customer
            const customer = await this.getOrCreateCustomer(user);

            // Wait for products to be initialized
            if (!this.priceIds[currency]) {
                await this.initializeProducts();
            }
            
            // Map package questions to plan type
            const planType = packageData.questions_per_month === 50 ? 'basic' : 'plus';
            const priceId = this.priceIds[currency]?.[planType];
            
            if (!priceId) {
                throw new Error(`Price not found for ${packageData.questions_per_month} questions package in ${currency}`);
            }
            
            // Create checkout session with custom UI mode
            const session = await this.stripe.checkout.sessions.create({
                customer: customer.id,
                ui_mode: 'custom',
                payment_method_types: ['card'],
                mode: 'payment',
                line_items: [
                    {
                        price: priceId,
                        quantity: 1
                    }
                ],
                metadata: {
                    userId: userId.toString(),
                    packageId: packageId.toString(),
                    questionsPerMonth: packageData.questions_per_month.toString(),
                    durationMonths: durationMonths.toString(),
                    currency: currency
                },
                return_url: `${process.env.SITE_URL || 'http://localhost:3001'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
                customer_update: {
                    address: 'auto'
                }
                // Disable automatic tax for now to avoid address requirements
                // automatic_tax: { enabled: true }
            });

            logger.info(`Custom checkout session created for user ${userId}, package ${packageId}: ${session.id}`);
            return session;
        } catch (error) {
            logger.error('Error creating custom checkout session:', error);
            throw error;
        }
    }

    /**
     * Create a checkout session for purchasing a package
     */
    async createCheckoutSession(userId, packageId, successUrl, cancelUrl, currency = 'GBP') {
        try {
            // Get user details
            const [users] = await pool.execute(
                'SELECT * FROM users WHERE id = ?',
                [userId]
            );

            if (!users.length) {
                throw new Error('User not found');
            }

            const user = users[0];

            // Get package details including duration
            const [packages] = await pool.execute(
                'SELECT * FROM packages WHERE id = ? AND is_active = TRUE',
                [packageId]
            );

            if (!packages.length) {
                throw new Error('Package not found');
            }

            const packageData = packages[0];
            const durationMonths = packageData.duration_months || 1;

            // Get or create Stripe customer
            const customer = await this.getOrCreateCustomer(user);

            // Wait for products to be initialized
            if (!this.priceIds[currency]) {
                await this.initializeProducts();
            }
            
            // Map package questions to plan type
            const planType = packageData.questions_per_month === 50 ? 'basic' : 'plus';
            const priceId = this.priceIds[currency]?.[planType];
            
            if (!priceId) {
                throw new Error(`Price not found for ${packageData.questions_per_month} questions package in ${currency}`);
            }
            
            // Create checkout session with proper Stripe price ID
            const session = await this.stripe.checkout.sessions.create({
                customer: customer.id,
                payment_method_types: ['card'],
                mode: 'payment',
                line_items: [
                    {
                        price: priceId,
                        quantity: 1
                    }
                ],
                metadata: {
                    userId: userId.toString(),
                    packageId: packageId.toString(),
                    questionsPerMonth: packageData.questions_per_month.toString(),
                    durationMonths: durationMonths.toString(),
                    currency: currency
                },
                success_url: successUrl + '&session_id={CHECKOUT_SESSION_ID}',
                cancel_url: cancelUrl
            });

            logger.info(`Checkout session created for user ${userId}, package ${packageId}: ${session.id}`);
            return session;
        } catch (error) {
            logger.error('Error creating checkout session:', error);
            throw error;
        }
    }

    /**
     * Create a Payment Intent for Stripe Elements
     */
    async createPaymentIntent(userId, packageId, currency = 'GBP') {
        try {
            // Get user details — userId comes from JWT payload
            logger.info(`createPaymentIntent called with userId=${userId} (type: ${typeof userId}), packageId=${packageId}`);

            const [users] = await pool.execute(
                'SELECT * FROM users WHERE id = ?',
                [userId]
            );

            if (!users[0]) {
                throw new Error('User not found');
            }

            const user = users[0];

            // Get package details
            const [packages] = await pool.execute(
                'SELECT * FROM packages WHERE id = ? AND is_active = TRUE',
                [packageId]
            );

            if (!packages[0]) {
                throw new Error('Package not found or inactive');
            }

            const packageData = packages[0];

            // Get or create Stripe customer
            const customer = await this.getOrCreateCustomer(user);

            // Wait for products to be initialized
            if (!this.currencyPricing[currency]) {
                await this.initializeProducts();
            }
            
            // Map package questions to plan type and get correct price
            const planType = packageData.questions_per_month === 50 ? 'basic' : 'plus';
            const amount = this.currencyPricing[currency]?.[planType];
            
            if (!amount) {
                throw new Error(`Price not found for ${packageData.questions_per_month} questions package in ${currency}`);
            }

            // Check for existing pending Payment Intent for this user/package combination
            const existingPaymentIntents = await this.stripe.paymentIntents.list({
                customer: customer.id,
                limit: 10
            });
            
            // Look for a recent incomplete Payment Intent for the same package
            const incompleteStatuses = ['requires_payment_method', 'requires_confirmation', 'requires_action'];
            
            logger.info(`Checking for existing Payment Intents for user ${userId}, package ${packageId}:`, {
                existingCount: existingPaymentIntents.data.length,
                existingIntents: existingPaymentIntents.data.map(intent => ({
                    id: intent.id,
                    status: intent.status,
                    amount: intent.amount,
                    currency: intent.currency,
                    userId: intent.metadata.userId,
                    packageId: intent.metadata.packageId,
                    created: new Date(intent.created * 1000).toISOString(),
                    ageMinutes: Math.floor((Date.now() - (intent.created * 1000)) / 60000)
                }))
            });
            
            const recentIncompleteIntent = existingPaymentIntents.data.find(intent => 
                incompleteStatuses.includes(intent.status) &&
                intent.metadata.userId === userId.toString() &&
                intent.metadata.packageId === packageId.toString() &&
                intent.amount === amount &&
                intent.currency === currency.toLowerCase() &&
                (Date.now() - (intent.created * 1000)) < 300000 // Created within last 5 minutes
            );
            
            if (recentIncompleteIntent) {
                logger.info(`Reusing existing incomplete Payment Intent: ${recentIncompleteIntent.id} (status: ${recentIncompleteIntent.status})`);
                return recentIncompleteIntent;
            }

            // Cancel old incomplete Payment Intents for this user to keep Stripe dashboard clean
            const oldIncompleteIntents = existingPaymentIntents.data.filter(intent =>
                incompleteStatuses.includes(intent.status) &&
                intent.metadata.userId === userId.toString() &&
                (Date.now() - (intent.created * 1000)) > 300000 // Older than 5 minutes
            );

            for (const oldIntent of oldIncompleteIntents) {
                try {
                    await this.stripe.paymentIntents.cancel(oldIntent.id);
                    logger.info(`Cancelled old incomplete Payment Intent: ${oldIntent.id}`);
                } catch (cancelError) {
                    logger.warn(`Could not cancel old Payment Intent ${oldIntent.id}:`, cancelError.message);
                }
            }

            // Create new Payment Intent with only card payments (no Link)
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: amount, // Already in smallest currency unit (pence/cents)
                currency: currency.toLowerCase(),
                customer: customer.id,
                automatic_payment_methods: {
                    enabled: true,
                    allow_redirects: 'never' // Prevent redirects for seamless experience
                }, // Allow all enabled payment methods from dashboard
                metadata: {
                    userId: userId.toString(),
                    packageId: packageId.toString(),
                    userEmail: user.email,
                    packageName: packageData.name,
                    questionsPerMonth: packageData.questions_per_month.toString()
                },
                description: `${packageData.name} - ${packageData.questions_per_month} interview questions`,
                payment_method_options: {
                    card: {
                        request_three_d_secure: 'automatic'
                    }
                }
            });

            logger.info(`Payment Intent created for user ${userId}: ${paymentIntent.id}`);
            return paymentIntent;

        } catch (error) {
            logger.error('Error creating payment intent:', error);
            throw error;
        }
    }

    /**
     * Confirm payment and create subscription after successful payment
     */
    async confirmPayment(paymentIntentId, userId, packageId = null) {
        try {
            // Retrieve the payment intent to verify it's paid
            const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
            
            if (paymentIntent.status !== 'succeeded') {
                throw new Error('Payment not completed');
            }

            // If there's a userId mismatch between JWT and payment intent metadata,
            // trust the payment intent metadata — it was set during PI creation with a proper DB lookup.
            if (paymentIntent.metadata.userId && paymentIntent.metadata.userId !== userId.toString()) {
                logger.warn(`Payment intent userId mismatch: PI has ${paymentIntent.metadata.userId}, JWT has ${userId} — using PI metadata userId`);
                userId = parseInt(paymentIntent.metadata.userId);
            }

            // Get package ID from payment intent metadata if not provided
            if (!packageId) {
                packageId = parseInt(paymentIntent.metadata.packageId);
                if (!packageId) {
                    throw new Error('Package ID not found in payment intent metadata');
                }
            }

            // Check if this payment intent has already been processed (with retry for deadlock)
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount < maxRetries) {
                try {
                    // Use a database lock to prevent race conditions between concurrent confirmPayment calls
                    // First, try to acquire a named lock specific to this payment intent
                    const lockName = `payment_${paymentIntentId}`;
                    const lockTimeout = 10; // seconds
                    
                    const [lockResult] = await pool.execute(
                        'SELECT GET_LOCK(?, ?) as lock_acquired',
                        [lockName, lockTimeout]
                    );
                    
                    if (!lockResult[0].lock_acquired) {
                        logger.warn(`Could not acquire lock for payment ${paymentIntentId}, another process is handling it`);
                        // Wait and check if the other process completed the payment
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                        const [completedPayment] = await pool.execute(
                            `SELECT s.*, p.questions_per_month, qu.question_count as current_questions
                             FROM user_subscriptions s 
                             JOIN packages p ON s.package_id = p.id 
                             LEFT JOIN question_usage qu ON qu.user_id = s.user_id AND qu.practice_session_id IS NULL
                             WHERE s.stripe_payment_intent = ?`,
                            [paymentIntentId]
                        );
                        
                        if (completedPayment.length > 0) {
                            const sub = completedPayment[0];
                            return {
                                subscriptionId: sub.id,
                                userId: sub.user_id,
                                packageId: sub.package_id,
                                questionsRemaining: sub.current_questions || sub.questions_remaining || sub.questions_per_month,
                                alreadyProcessed: true,
                                packageName: `${sub.questions_per_month} Questions Package`
                            };
                        }
                        
                        throw new Error('Could not acquire payment processing lock and no completed payment found');
                    }
                    
                    try {
                        // Now that we have the lock, check for existing records one more time
                        const [existingPayments] = await pool.execute(
                            'SELECT id FROM user_subscriptions WHERE stripe_payment_intent = ?',
                            [paymentIntentId]
                        );
                        
                        if (existingPayments.length > 0) {
                            logger.info(`Payment intent ${paymentIntentId} subscription already exists (found while holding lock), returning existing data`);
                            
                            // Return the existing subscription data with question credit info
                            const [existingSubscription] = await pool.execute(
                                `SELECT s.*, p.questions_per_month, qu.question_count as current_questions
                                 FROM user_subscriptions s 
                                 JOIN packages p ON s.package_id = p.id 
                                 LEFT JOIN question_usage qu ON qu.user_id = s.user_id AND qu.practice_session_id IS NULL
                                 WHERE s.stripe_payment_intent = ?`,
                                [paymentIntentId]
                            );
                            
                            const sub = existingSubscription[0];
                            return {
                                subscriptionId: sub.id,
                                userId: sub.user_id,
                                packageId: sub.package_id,
                                questionsRemaining: sub.current_questions || sub.questions_remaining || sub.questions_per_month,
                                alreadyProcessed: true,
                                packageName: `${sub.questions_per_month} Questions Package`
                            };
                        }
                        
                        // Also check payment_history to catch any orphaned payment records
                        const [existingPaymentHistory] = await pool.execute(
                            'SELECT id FROM payment_history WHERE stripe_payment_intent = ?',
                            [paymentIntentId]
                        );
                        
                        if (existingPaymentHistory.length > 0) {
                            logger.warn(`Payment intent ${paymentIntentId} already exists in payment_history but no subscription found - potential data inconsistency`);
                            throw new Error('Payment already processed but subscription data missing. Please contact support.');
                        }
                    
                    } catch (lockError) {
                        logger.error('Error in lock critical section:', lockError);
                        throw lockError;
                    }
                    
                    // No existing payment found, continue with creation
                    break;
                    
                } catch (error) {
                    if (error.code === 'ER_LOCK_DEADLOCK' && retryCount < maxRetries - 1) {
                        retryCount++;
                        logger.warn(`Deadlock detected on payment check, retrying (${retryCount}/${maxRetries})...`);
                        await new Promise(resolve => setTimeout(resolve, 100 * retryCount)); // Exponential backoff
                        continue;
                    }
                    throw error;
                }
            }

            // Create new subscription with deadlock retry protection
            let transactionRetryCount = 0;
            const maxTransactionRetries = 3;
            let subscriptionResult = null;
            
            while (transactionRetryCount < maxTransactionRetries) {
                const connection = await pool.getConnection();
                
                try {
                    await connection.beginTransaction();

                    // Get package details for duration
                    const [packages] = await connection.execute(
                        'SELECT * FROM packages WHERE id = ? AND is_active = TRUE',
                        [packageId]
                    );

                    if (!packages[0]) {
                        throw new Error('Package not found or inactive');
                    }

                    const packageData = packages[0];
                    const questionsPerMonth = packageData.questions_per_month;
                    const packageDuration = packageData.duration_months || 1;

                    const currentDate = new Date();
                    const endDate = new Date(currentDate);
                    endDate.setMonth(endDate.getMonth() + packageDuration);

                    logger.info('Inserting subscription record...', {
                        userId,
                        packageId,
                        payment_intent: paymentIntentId,
                        customer_id: paymentIntent.customer,
                        questions: questionsPerMonth,
                        amount: paymentIntent.amount / 100
                    });
                    
                    const [result] = await connection.execute(
                        `INSERT INTO user_subscriptions 
                        (user_id, package_id, stripe_payment_intent, stripe_customer_id, status, 
                         questions_used, questions_remaining, current_period_start, current_period_end, 
                         stripe_session_id, amount_paid_gbp) 
                        VALUES (?, ?, ?, ?, 'active', 0, ?, ?, ?, ?, ?)`,
                        [
                            userId,
                            packageId,
                            paymentIntentId,
                            paymentIntent.customer,
                            questionsPerMonth,
                            currentDate,
                            endDate,
                            `pi_session_${paymentIntentId}`, // Synthetic session ID
                            paymentIntent.amount / 100 // Convert from cents to main currency
                        ]
                    );

                    const subscriptionId = result.insertId;
                    
                    logger.info('Subscription inserted successfully:', {
                        subscriptionId: subscriptionId,
                        affectedRows: result.affectedRows
                    });

                    // Update user's payment status
                    await connection.execute(
                        'UPDATE users SET has_active_subscription = TRUE, last_payment_date = NOW() WHERE id = ?',
                        [userId]
                    );

                    // Record payment in payment_history table
                    await connection.execute(
                        `INSERT INTO payment_history 
                        (user_id, subscription_id, stripe_payment_intent, stripe_session_id, amount_gbp, currency, payment_status, payment_method) 
                        VALUES (?, ?, ?, ?, ?, ?, 'succeeded', 'card')`,
                        [
                            userId,
                            subscriptionId,
                            paymentIntentId,
                            `pi_session_${paymentIntentId}`,
                            paymentIntent.amount / 100,
                            paymentIntent.currency.toUpperCase()
                        ]
                    );
                    
                    logger.info('Payment recorded in payment_history table');
                    
                    // Handle question credit - similar to checkout session logic.
                    // mode IS NULL targets the shared paid pool specifically, so this never
                    // accumulates into one of a trial user's separate practice/simulate credits.
                    const [existingCredit] = await connection.execute(
                        `SELECT id, question_count, expiry_date
                         FROM question_usage
                         WHERE user_id = ? AND practice_session_id IS NULL AND mode IS NULL
                         ORDER BY id DESC LIMIT 1`,
                        [userId]
                    );
                    
                    if (existingCredit.length > 0) {
                        // User has existing credit - accumulate the new questions
                        const existingQuestions = existingCredit[0].question_count;
                        const existingExpiry = new Date(existingCredit[0].expiry_date);
                        const now = new Date();
                        const isExpired = existingExpiry.getTime() < now.getTime();
                        
                        let newExpiryDate = endDate;
                        let totalQuestions = questionsPerMonth;
                        
                        if (!isExpired) {
                            const remainingTimeMs = Math.max(0, existingExpiry.getTime() - now.getTime());
                            newExpiryDate = new Date(now.getTime() + remainingTimeMs + (packageDuration * 30 * 24 * 60 * 60 * 1000));
                            totalQuestions = existingQuestions + questionsPerMonth;
                        }
                        
                        // Update the existing credit record
                        await connection.execute(
                            `UPDATE question_usage 
                             SET question_count = ?, expiry_date = ?
                             WHERE id = ?`,
                            [totalQuestions, newExpiryDate, existingCredit[0].id]
                        );
                        
                        logger.info(isExpired
                            ? `Question credit reset: ${totalQuestions} questions, expires ${newExpiryDate}`
                            : `Question credit accumulated: ${totalQuestions} total questions (added ${questionsPerMonth}), expires ${newExpiryDate}`
                        );
                    } else {
                        // First time user - create initial credit balance
                        await connection.execute(
                            `INSERT INTO question_usage 
                            (user_id, subscription_id, practice_session_id, question_count, expiry_date) 
                            VALUES (?, ?, NULL, ?, ?)`,
                            [
                                userId,
                                subscriptionId,
                                questionsPerMonth,
                                endDate
                            ]
                        );
                        
                        logger.info(`Question credit initialized: ${questionsPerMonth} questions available until ${endDate}`);
                    }

                    // Commit transaction
                    await connection.commit();
                    
                    // Store the successful result
                    subscriptionResult = { subscriptionId, questionsPerMonth, endDate, packageData };
                    break; // Success - exit retry loop
                    
                } catch (error) {
                    await connection.rollback();

                    // The UNIQUE constraint on stripe_payment_intent is the authoritative
                    // duplicate guard — the GET_LOCK above isn't reliable across a connection
                    // pool, so a concurrent call (e.g. webhook racing the frontend confirm call)
                    // can reach this INSERT for the same payment. Treat that as success, not an error.
                    if (error.code === 'ER_DUP_ENTRY' && error.message.includes('stripe_payment_intent')) {
                        logger.info(`Payment intent ${paymentIntentId} already has a subscription (caught by unique constraint) — returning existing record`);
                        const [existing] = await pool.execute(
                            `SELECT s.*, p.questions_per_month, qu.question_count as current_questions
                             FROM user_subscriptions s
                             JOIN packages p ON s.package_id = p.id
                             LEFT JOIN question_usage qu ON qu.user_id = s.user_id AND qu.practice_session_id IS NULL
                             WHERE s.stripe_payment_intent = ?`,
                            [paymentIntentId]
                        );
                        if (existing.length > 0) {
                            const sub = existing[0];
                            subscriptionResult = {
                                subscriptionId: sub.id,
                                questionsPerMonth: sub.current_questions || sub.questions_remaining || sub.questions_per_month,
                                alreadyProcessed: true
                            };
                            break;
                        }
                    }

                    if (error.code === 'ER_LOCK_DEADLOCK' && transactionRetryCount < maxTransactionRetries - 1) {
                        transactionRetryCount++;
                        logger.warn(`Transaction deadlock detected, retrying (${transactionRetryCount}/${maxTransactionRetries})...`);
                        await new Promise(resolve => setTimeout(resolve, 100 * transactionRetryCount)); // Exponential backoff
                        continue;
                    }

                    throw error;
                } finally {
                    connection.release();
                }
            }

            if (!subscriptionResult) {
                throw new Error('Failed to create subscription after maximum retries');
            }

            const { subscriptionId, questionsPerMonth, alreadyProcessed } = subscriptionResult;

            logger.info(`Payment confirmed and subscription created for user ${userId}: ${subscriptionId}`);

            return {
                subscriptionId,
                userId,
                packageId,
                questionsRemaining: questionsPerMonth,
                paymentIntentId,
                ...(alreadyProcessed ? { alreadyProcessed: true } : {})
            };

        } catch (error) {
            logger.error('Error confirming payment:', error);
            throw error;
        } finally {
            // Release the payment lock if it was acquired
            if (paymentIntentId) {
                const lockName = `payment_${paymentIntentId}`;
                try {
                    await pool.execute('SELECT RELEASE_LOCK(?)', [lockName]);
                } catch (lockError) {
                    logger.warn('Error releasing payment lock:', lockError);
                }
            }
        }
    }

    /**
     * Handle successful payment and activate subscription
     */
    async handleSuccessfulPayment(sessionId) {
        try {
            logger.info(`Processing payment for session: ${sessionId}`);
            
            // Retrieve the session from Stripe
            const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
                expand: ['line_items', 'customer']
            });
            
            logger.info('Stripe session retrieved:', {
                id: session.id,
                payment_status: session.payment_status,
                amount_total: session.amount_total,
                customer: session.customer?.id,
                metadata: session.metadata
            });

            if (session.payment_status !== 'paid') {
                throw new Error('Payment not completed');
            }

            const userId = parseInt(session.metadata.userId);
            const packageId = parseInt(session.metadata.packageId);
            const questionsPerMonth = parseInt(session.metadata.questionsPerMonth);
            
            logger.info('Parsed metadata:', {
                userId,
                packageId,
                questionsPerMonth
            });

            // Start a database transaction
            const connection = await pool.getConnection();
            await connection.beginTransaction();

            try {
                // Check if this session has already been processed
                const [existingSessions] = await connection.execute(
                    'SELECT id FROM user_subscriptions WHERE stripe_session_id = ?',
                    [sessionId]
                );
                
                if (existingSessions.length > 0) {
                    logger.info(`Session ${sessionId} has already been processed, skipping`);
                    await connection.rollback();
                    connection.release();
                    
                    // Return the existing subscription data
                    const [existingSubscription] = await pool.execute(
                        `SELECT s.*, p.questions_per_month 
                         FROM user_subscriptions s 
                         JOIN packages p ON s.package_id = p.id 
                         WHERE s.stripe_session_id = ?`,
                        [sessionId]
                    );
                    
                    return {
                        subscriptionId: existingSubscription[0].id,
                        userId: existingSubscription[0].user_id,
                        packageId: existingSubscription[0].package_id,
                        questionsRemaining: existingSubscription[0].questions_remaining,
                        alreadyProcessed: true
                    };
                }
                
                // Keep all existing active subscriptions (allow multiple active packages)

                // Create new subscription with package-specific duration
                const currentDate = new Date();
                const endDate = new Date(currentDate);
                const packageDuration = parseInt(session.metadata.durationMonths) || 1;
                endDate.setMonth(endDate.getMonth() + packageDuration);

                logger.info('Inserting subscription record...', {
                    userId,
                    packageId,
                    payment_intent: session.payment_intent,
                    customer_id: session.customer?.id,
                    questions: questionsPerMonth,
                    amount: session.amount_total / 100,
                    sessionId
                });
                
                const [result] = await connection.execute(
                    `INSERT INTO user_subscriptions 
                    (user_id, package_id, stripe_payment_intent, stripe_customer_id, status, 
                     questions_used, questions_remaining, current_period_start, current_period_end, 
                     stripe_session_id, amount_paid_gbp) 
                    VALUES (?, ?, ?, ?, 'active', 0, ?, ?, ?, ?, ?)`,
                    [
                        userId,
                        packageId,
                        session.payment_intent,
                        session.customer.id,
                        questionsPerMonth,
                        currentDate,
                        endDate,
                        sessionId,
                        session.amount_total / 100 // Convert from pence to pounds
                    ]
                );

                const subscriptionId = result.insertId;
                
                logger.info('Subscription inserted successfully:', {
                    subscriptionId: subscriptionId,
                    affectedRows: result.affectedRows
                });

                // Update user's payment status
                await connection.execute(
                    'UPDATE users SET has_active_subscription = TRUE, last_payment_date = NOW() WHERE id = ?',
                    [userId]
                );

                // Record payment in payment_history table
                await connection.execute(
                    `INSERT INTO payment_history 
                    (user_id, subscription_id, stripe_payment_intent, stripe_session_id, amount_gbp, currency, payment_status, payment_method) 
                    VALUES (?, ?, ?, ?, ?, 'GBP', 'succeeded', 'card')`,
                    [
                        userId,
                        subscriptionId,
                        session.payment_intent,
                        sessionId,
                        session.amount_total / 100 // Convert from pence to pounds
                    ]
                );
                
                logger.info('Payment recorded in payment_history table');
                
                // Check if user already has a credit balance in question_usage.
                // mode IS NULL targets the shared paid pool specifically, so this never
                // accumulates into one of a trial user's separate practice/simulate credits.
                const [existingCredit] = await connection.execute(
                    `SELECT id, question_count, expiry_date
                     FROM question_usage
                     WHERE user_id = ? AND practice_session_id IS NULL AND mode IS NULL
                     ORDER BY id DESC LIMIT 1`,
                    [userId]
                );
                
                if (existingCredit.length > 0) {
                    // User has existing credit - accumulate the new questions
                    const existingQuestions = existingCredit[0].question_count;
                    const existingExpiry = new Date(existingCredit[0].expiry_date);
                    const now = new Date();
                    const isExpired = existingExpiry.getTime() < now.getTime();
                    
                    let newExpiryDate = endDate;
                    let totalQuestions = questionsPerMonth;
                    
                    if (!isExpired) {
                        const remainingTimeMs = Math.max(0, existingExpiry.getTime() - now.getTime());
                        const newExpiryDateMs = now.getTime() + remainingTimeMs + (packageDuration * 30 * 24 * 60 * 60 * 1000);
                        newExpiryDate = new Date(newExpiryDateMs);
                        totalQuestions = existingQuestions + questionsPerMonth;
                    }
                    
                    // Update the existing credit record
                    await connection.execute(
                        `UPDATE question_usage 
                         SET question_count = ?, expiry_date = ?
                         WHERE id = ?`,
                        [totalQuestions, newExpiryDate, existingCredit[0].id]
                    );
                    
                    logger.info(isExpired
                        ? `Question credit reset: ${totalQuestions} questions, expires ${newExpiryDate}`
                        : `Question credit accumulated: ${totalQuestions} total questions (added ${questionsPerMonth}), expires ${newExpiryDate}`
                    );
                } else {
                    // First time user - create initial credit balance
                    await connection.execute(
                        `INSERT INTO question_usage 
                        (user_id, subscription_id, practice_session_id, question_count, expiry_date) 
                        VALUES (?, ?, NULL, ?, ?)`,
                        [
                            userId,
                            subscriptionId,
                            questionsPerMonth,  // Full allowance (50 or 100)
                            endDate
                        ]
                    );
                    
                    logger.info(`Question credit initialized: ${questionsPerMonth} questions available until ${endDate}`);
                }

                // Commit transaction
                await connection.commit();

                logger.info(`Subscription activated for user ${userId}: subscription ${subscriptionId}`);

                return {
                    subscriptionId,
                    userId,
                    packageId,
                    questionsRemaining: questionsPerMonth
                };
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } catch (error) {
            logger.error('Error handling successful payment:', error);
            throw error;
        }
    }

    /**
     * Find the credit record a question should be drawn from for the given mode:
     * the shared paid pool (mode IS NULL) takes priority and is usable by either
     * mode; if that's empty/missing, fall back to the mode-specific trial credit.
     */
    async _findActiveCredit(userId, mode) {
        const [sharedCredit] = await pool.execute(
            `SELECT id, question_count, expiry_date
             FROM question_usage
             WHERE user_id = ? AND practice_session_id IS NULL AND mode IS NULL
             ORDER BY id DESC LIMIT 1`,
            [userId]
        );

        if (sharedCredit.length && sharedCredit[0].question_count > 0 && new Date(sharedCredit[0].expiry_date) >= new Date()) {
            return sharedCredit[0];
        }

        if (mode) {
            const [modeCredit] = await pool.execute(
                `SELECT id, question_count, expiry_date
                 FROM question_usage
                 WHERE user_id = ? AND practice_session_id IS NULL AND mode = ?
                 ORDER BY id DESC LIMIT 1`,
                [userId, mode]
            );
            if (modeCredit.length && new Date(modeCredit[0].expiry_date) >= new Date()) {
                return modeCredit[0];
            }
        }

        // Nothing usable for this mode — fall back to whatever the shared query found
        // (possibly expired/empty) so callers see a consistent "no credit" result.
        return sharedCredit[0] || null;
    }

    /**
     * Check if user has active subscriptions (now supports multiple).
     * Pass `mode` ('practice' or 'simulate') to check that mode's specific
     * credit (shared pool first, then mode-specific trial credit). Omit it
     * for general display purposes, where remaining questions across all
     * active pools are summed.
     */
    async checkUserSubscription(userId, mode = null) {
        try {
            // Get all active subscriptions
            const [subscriptions] = await pool.execute(
                `SELECT s.*, p.name as package_name, p.questions_per_month
                 FROM user_subscriptions s
                 JOIN packages p ON s.package_id = p.id
                 WHERE s.user_id = ? AND s.status = 'active'
                 AND s.current_period_end > NOW()
                 ORDER BY s.created_at DESC`,
                [userId]
            );

            if (subscriptions.length === 0) {
                return null;
            }

            // Mark expired subscriptions as inactive
            for (const sub of subscriptions) {
                if (new Date(sub.current_period_end) < new Date()) {
                    await pool.execute(
                        'UPDATE user_subscriptions SET status = "inactive" WHERE id = ?',
                        [sub.id]
                    );
                }
            }

            let questionsRemaining;
            let creditId;
            let expiryDate;

            if (mode) {
                const credit = await this._findActiveCredit(userId, mode);
                if (!credit || credit.question_count <= 0 || new Date(credit.expiry_date) < new Date()) {
                    return null;
                }
                questionsRemaining = credit.question_count;
                creditId = credit.id;
                expiryDate = credit.expiry_date;
            } else {
                // No specific mode requested — sum all active, unexpired credit pools for display
                const [allCredits] = await pool.execute(
                    `SELECT id, question_count, expiry_date, mode
                     FROM question_usage
                     WHERE user_id = ? AND practice_session_id IS NULL
                     AND expiry_date >= NOW() AND question_count > 0`,
                    [userId]
                );

                if (!allCredits.length) {
                    return null;
                }

                questionsRemaining = allCredits.reduce((sum, c) => sum + c.question_count, 0);
                creditId = allCredits[0].id;
                expiryDate = allCredits[0].expiry_date;
            }

            // Return aggregated subscription info
            return {
                id: creditId, // Use credit record ID for tracking
                user_id: userId,
                questions_remaining: questionsRemaining,
                expiry_date: expiryDate,
                active_subscriptions: subscriptions.length,
                subscriptions: subscriptions
            };
        } catch (error) {
            logger.error('Error checking user subscription:', error);
            throw error;
        }
    }

    /**
     * Use a question, drawing from the shared paid pool first, falling back
     * to the mode-specific trial credit ('practice' or 'simulate') if provided.
     */
    async useQuestion(userId, sessionId, questionCount = 1, mode = null) {
        try {
            const credit = await this._findActiveCredit(userId, mode);

            if (!credit) {
                throw new Error('No question credit found for user');
            }

            const questionsRemaining = credit.question_count;

            if (questionsRemaining <= 0) {
                throw new Error('No questions remaining in subscription');
            }

            if (questionsRemaining < questionCount) {
                throw new Error(`Only ${questionsRemaining} questions remaining, but ${questionCount} requested`);
            }

            // Decrement the question count in the credit record
            await pool.execute(
                `UPDATE question_usage
                 SET question_count = question_count - ?
                 WHERE id = ?`,
                [questionCount, credit.id]
            );

            const newQuestionsRemaining = questionsRemaining - questionCount;

            logger.info(`Question used by user ${userId} (mode: ${mode || 'shared'}): ${newQuestionsRemaining} remaining in that pool`);

            return {
                questionsRemaining: newQuestionsRemaining,
                questionsUsed: questionCount
            };
        } catch (error) {
            logger.error('Error using question:', error);
            throw error;
        }
    }

    /**
     * Get user's subscription history
     */
    async getUserSubscriptionHistory(userId) {
        try {
            const [subscriptions] = await pool.execute(
                `SELECT s.*, p.name as package_name, p.questions_per_month, p.price_gbp 
                 FROM user_subscriptions s 
                 JOIN packages p ON s.package_id = p.id 
                 WHERE s.user_id = ? 
                 ORDER BY s.created_at DESC`,
                [userId]
            );

            return subscriptions;
        } catch (error) {
            logger.error('Error getting subscription history:', error);
            throw error;
        }
    }

    /**
     * Handle successful Payment Intent (for Stripe Elements)
     */
    async handleSuccessfulPaymentIntent(paymentIntent) {
        try {
            logger.info(`Processing Payment Intent webhook: ${paymentIntent.id}`);
            
            // Extract user and package info from metadata
            const userId = parseInt(paymentIntent.metadata.userId);
            const packageId = parseInt(paymentIntent.metadata.packageId);
            
            if (!userId || !packageId) {
                throw new Error('Missing required metadata in payment intent');
            }
            
            // Use the existing confirmPayment method that has duplicate detection built-in
            logger.info('Webhook calling confirmPayment with duplicate detection...');
            const result = await this.confirmPayment(paymentIntent.id, userId, packageId);
            
            logger.info('Payment Intent webhook processing completed:', {
                paymentIntentId: paymentIntent.id,
                userId,
                subscriptionId: result.subscriptionId
            });
            
            return result;
            
        } catch (error) {
            logger.error('Error processing Payment Intent:', error);
            throw error;
        }
    }

    /**
     * Create a webhook endpoint to handle Stripe events
     */
    async handleWebhook(rawBody, signature) {
        try {
            const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
            
            // Verify webhook signature
            const event = this.stripe.webhooks.constructEvent(
                rawBody,
                signature,
                endpointSecret
            );

            // Handle different event types
            switch (event.type) {
                case 'checkout.session.completed':
                    // Handle both hosted and custom UI checkout sessions
                    await this.handleSuccessfulPayment(event.data.object.id);
                    break;
                
                case 'payment_intent.succeeded':
                    // Process as fallback in case frontend confirm call failed
                    // confirmPayment is idempotent — already-processed intents are safe to call again
                    logger.info(`Webhook: Payment Intent ${event.data.object.id} succeeded — processing as fallback`);
                    try {
                        const pi = event.data.object;
                        const metaUserId = pi.metadata && pi.metadata.userId ? parseInt(pi.metadata.userId) : null;
                        if (metaUserId) {
                            await this.confirmPayment(pi.id, metaUserId, null);
                            logger.info(`Webhook: Successfully processed payment ${pi.id} for user ${metaUserId}`);
                        } else {
                            logger.warn(`Webhook: Payment Intent ${pi.id} has no userId in metadata, skipping`);
                        }
                    } catch (webhookErr) {
                        // Log but don't fail — might already be processed by frontend
                        logger.warn(`Webhook: confirmPayment for ${event.data.object.id} returned: ${webhookErr.message}`);
                    }
                    break;
                
                case 'payment_intent.payment_failed':
                    logger.error('Payment failed:', event.data.object);
                    break;
                
                default:
                    logger.info(`Unhandled webhook event type: ${event.type}`);
            }

            return { received: true };
        } catch (error) {
            logger.error('Webhook error:', error);
            throw error;
        }
    }
}

module.exports = new StripeService();