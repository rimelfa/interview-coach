const { pool } = require('../config/database');
const logger = require('./logger');

class AdminService {
    /**
     * Get overall dashboard metrics with date filtering
     */
    async getDashboardMetrics(dateFilter = 'all_time') {
        try {
            const metrics = {};
            const dateCondition = this.getDateCondition(dateFilter);

            // Total Users with verification breakdown (with date filter, excluding test emails)
            const [userCounts] = await pool.execute(
                `SELECT 
                    COUNT(*) as total_users,
                    SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) as verified_users,
                    SUM(CASE WHEN is_verified = 0 THEN 1 ELSE 0 END) as unverified_users
                FROM users 
                WHERE email NOT IN ('rimelaafia@gmail.com', 'laafiarime@gmail.com') 
                ${dateCondition ? `AND ${dateCondition}` : ''}`
            );
            metrics.totalUsers = userCounts[0].total_users;
            metrics.verifiedUsers = userCounts[0].verified_users;
            metrics.unverifiedUsers = userCounts[0].unverified_users;

            // Auth method breakdown (with date filter, excluding test emails)
            const [authCounts] = await pool.execute(
                `SELECT 
                    SUM(CASE WHEN auth_provider = 'google' THEN 1 ELSE 0 END) as google_users,
                    SUM(CASE WHEN auth_provider = 'local' OR auth_provider IS NULL THEN 1 ELSE 0 END) as email_users
                FROM users 
                WHERE email NOT IN ('rimelaafia@gmail.com', 'laafiarime@gmail.com') 
                ${dateCondition ? `AND ${dateCondition}` : ''}`
            );
            metrics.googleUsers = authCounts[0].google_users;
            metrics.emailUsers = authCounts[0].email_users;

            // Test users count (with date filter, excluding test emails)
            const [testUsersCount] = await pool.execute(
                `SELECT COUNT(*) as count 
                FROM users 
                WHERE has_used_test = 1 
                AND email NOT IN ('rimelaafia@gmail.com', 'laafiarime@gmail.com') 
                ${dateCondition ? `AND ${dateCondition}` : ''}`
            );
            metrics.testUsers = testUsersCount[0].count;

            // Incomplete payments (users with Stripe ID but no active subscription)
            const [incompletePayments] = await pool.execute(
                `SELECT COUNT(*) as count 
                FROM users 
                WHERE stripe_customer_id IS NOT NULL 
                AND has_active_subscription = 0 
                AND email NOT IN ('rimelaafia@gmail.com', 'laafiarime@gmail.com') 
                ${dateCondition ? `AND ${dateCondition}` : ''}`
            );
            metrics.incompletePayments = incompletePayments[0].count;

            // New Users (based on date filter, excluding test emails)
            const [newUsers] = await pool.execute(
                `SELECT COUNT(*) as count FROM users WHERE is_verified = TRUE AND email NOT IN ('rimelaafia@gmail.com', 'laafiarime@gmail.com') ${dateCondition ? `AND ${dateCondition}` : ''}`
            );
            metrics.newUsers = newUsers[0].count;

            // Total Revenue (with date filter, excluding test emails)
            const [revenue] = await pool.execute(
                `SELECT COALESCE(SUM(ph.amount_gbp), 0) as total
                FROM payment_history ph
                JOIN users u ON ph.user_id = u.id
                WHERE ph.payment_status = "succeeded"
                AND u.email NOT IN ('rimelaafia@gmail.com', 'laafiarime@gmail.com')
                ${dateCondition ? `AND ${dateCondition.replace('created_at', 'ph.created_at')}` : ''}`
            );
            metrics.totalRevenue = Number(revenue[0].total) || 0;

            // Practice Sessions (with date filter, excluding test emails)
            const [sessions] = await pool.execute(
                `SELECT COUNT(*) as count 
                FROM user_sessions us 
                JOIN users u ON us.user_id = u.id 
                WHERE us.session_type = "practice" 
                AND u.email NOT IN ('rimelaafia@gmail.com', 'laafiarime@gmail.com')
                ${dateCondition ? `AND ${dateCondition.replace('created_at', 'us.created_at')}` : ''}`
            );
            metrics.practiceSessions = sessions[0].count;

            // Active Paid Subscriptions (non-expired, has a payment, excluding test emails)
            const [subscriptions] = await pool.execute(
                `SELECT COUNT(*) as count
                FROM user_subscriptions sub
                JOIN users u ON sub.user_id = u.id
                WHERE sub.status = "active"
                AND sub.current_period_end > NOW()
                AND sub.amount_paid_gbp > 0
                AND u.email NOT IN ('rimelaafia@gmail.com', 'laafiarime@gmail.com')
                ${dateCondition ? `AND ${dateCondition.replace('created_at', 'sub.created_at')}` : ''}`
            );
            metrics.activeSubscriptions = subscriptions[0].count;

            // Free Trial Users (active free trials, excluding test emails)
            const [freeTrials] = await pool.execute(
                `SELECT COUNT(*) as count
                FROM user_subscriptions sub
                JOIN users u ON sub.user_id = u.id
                WHERE sub.status = "active"
                AND sub.current_period_end > NOW()
                AND sub.amount_paid_gbp = 0
                AND u.email NOT IN ('rimelaafia@gmail.com', 'laafiarime@gmail.com')
                ${dateCondition ? `AND ${dateCondition.replace('created_at', 'sub.created_at')}` : ''}`
            );
            metrics.freeTrialUsers = freeTrials[0].count;

            // Guest test sessions (no account required)
            const [guestSessions] = await pool.execute(
                `SELECT COUNT(*) as count FROM guest_test_sessions
                ${dateCondition ? `WHERE ${dateCondition.replace('created_at', 'guest_test_sessions.created_at')}` : ''}`
            );
            metrics.guestSessions = guestSessions[0].count;

            // Conversion Rate (users with purchases / total verified users in period, excluding test emails)
            const [purchasingUsers] = await pool.execute(
                `SELECT COUNT(DISTINCT ph.user_id) as count 
                FROM payment_history ph 
                JOIN users u ON ph.user_id = u.id 
                WHERE ph.payment_status = "succeeded" 
                AND u.email NOT IN ('rimelaafia@gmail.com', 'laafiarime@gmail.com')
                ${dateCondition ? `AND ${dateCondition.replace('created_at', 'ph.created_at')}` : ''}`
            );
            const conversionRate = metrics.totalUsers > 0
                ? (purchasingUsers[0].count / metrics.totalUsers) * 100
                : 0;
            metrics.conversionRate = conversionRate;

            // Questions Used (by date period, excluding test emails)
            const [questionsUsed] = await pool.execute(
                `SELECT SUM(question_count) as total
                FROM question_usage qu
                JOIN users u ON qu.user_id = u.id
                WHERE u.email NOT IN ('rimelaafia@gmail.com', 'laafiarime@gmail.com')
                AND practice_session_id IS NOT NULL
                ${dateCondition ? `AND ${dateCondition.replace('created_at', 'qu.usage_timestamp')}` : ''}`
            );
            metrics.questionsUsed = questionsUsed[0].total || 0;

            // Cancelled Subscriptions (period, excluding test emails)
            const [cancelled] = await pool.execute(
                `SELECT COUNT(*) as count
                FROM user_subscriptions sub
                JOIN users u ON sub.user_id = u.id
                WHERE sub.status = "cancelled"
                AND u.email NOT IN ('rimelaafia@gmail.com', 'laafiarime@gmail.com')
                ${dateCondition ? `AND ${dateCondition.replace('created_at', 'sub.updated_at')}` : ''}`
            );
            metrics.cancelledSubscriptions = cancelled[0].count;

            // Average questions per user (active users in period)
            const [activeUsers] = await pool.execute(
                `SELECT COUNT(DISTINCT user_id) as count FROM question_usage
                WHERE practice_session_id IS NOT NULL
                ${dateCondition ? `AND ${dateCondition.replace('created_at', 'usage_timestamp')}` : ''}`
            );
            const activeUserCount = activeUsers[0].count || 0;
            metrics.avgQuestionsPerUser = activeUserCount > 0
                ? (metrics.questionsUsed / activeUserCount).toFixed(1)
                : 0;

            logger.info('Dashboard metrics retrieved successfully');
            return metrics;

        } catch (error) {
            logger.error('Error getting dashboard metrics:', error);
            throw error;
        }
    }

    /**
     * Get chart data for dashboard
     */
    async getChartData(dateFilter = 'last_30_days') {
        try {
            const dateCondition = this.getDateCondition(dateFilter);
            const last30Days = this.getLast30Days();
            const rangeCondition = dateCondition || 'created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';

            // Funnel totals for selected period
            const [[{ guest_count }]] = await pool.execute(`
                SELECT COUNT(*) as guest_count FROM guest_test_sessions
                WHERE ${rangeCondition.replace('created_at', 'guest_test_sessions.created_at')}
            `);
            const [[{ signup_count }]] = await pool.execute(`
                SELECT COUNT(*) as signup_count FROM users
                WHERE is_verified = TRUE AND email NOT IN ('rimelaafia@gmail.com', 'laafiarime@gmail.com')
                AND ${rangeCondition}
            `);
            const [[{ purchase_count }]] = await pool.execute(`
                SELECT COUNT(DISTINCT ph.user_id) as purchase_count
                FROM payment_history ph
                JOIN users u ON ph.user_id = u.id
                WHERE ph.payment_status = 'succeeded' AND u.email NOT IN ('rimelaafia@gmail.com', 'laafiarime@gmail.com')
                AND ${rangeCondition.replace('created_at', 'ph.created_at')}
            `);

            // Daily revenue (last 30 days)
            const [revenueData] = await pool.execute(`
                SELECT DATE(ph.created_at) as date, SUM(ph.amount_gbp) as daily_revenue
                FROM payment_history ph
                JOIN users u ON ph.user_id = u.id
                WHERE ph.payment_status = 'succeeded' AND u.email NOT IN ('rimelaafia@gmail.com', 'laafiarime@gmail.com')
                    AND ph.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY DATE(ph.created_at)
                ORDER BY date
            `);

            // Daily practice sessions (last 30 days)
            const [sessionData] = await pool.execute(`
                SELECT DATE(us.created_at) as date, COUNT(*) as session_count
                FROM user_sessions us
                JOIN users u ON us.user_id = u.id
                WHERE us.session_type = 'practice' AND u.email NOT IN ('rimelaafia@gmail.com', 'laafiarime@gmail.com')
                    AND us.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY DATE(us.created_at)
                ORDER BY date
            `);

            // Build daily revenue array + cumulative
            const dailyRevenue = last30Days.map(date => {
                const day = revenueData.find(d => this.formatDate(new Date(d.date)) === this.formatDate(date));
                return day ? parseFloat(day.daily_revenue) : 0;
            });
            let running = 0;
            const cumulativeRevenue = dailyRevenue.map(v => { running += v; return parseFloat(running.toFixed(2)); });

            // Build daily sessions array
            const dailySessions = last30Days.map(date => {
                const day = sessionData.find(d => this.formatDate(new Date(d.date)) === this.formatDate(date));
                return day ? day.session_count : 0;
            });

            return {
                funnel: {
                    labels: ['Guest Sessions', 'Signups', 'Purchases'],
                    data: [Number(guest_count), Number(signup_count), Number(purchase_count)],
                },
                revenue: {
                    labels: last30Days.map(date => this.formatDate(date)),
                    daily: dailyRevenue,
                    cumulative: cumulativeRevenue,
                },
                sessions: {
                    labels: last30Days.map(date => this.formatDate(date)),
                    data: dailySessions,
                },
            };

        } catch (error) {
            logger.error('Error getting chart data:', error);
            throw error;
        }
    }

    /**
     * Get recent activity feed
     */
    async getRecentActivity(limit = 20) {
        try {
            const activities = [];

            // Recent user registrations (excluding test emails)
            const [recentUsers] = await pool.execute(`
                SELECT name, email, created_at, auth_provider
                FROM users 
                WHERE is_verified = TRUE
                AND email NOT IN ('rimelaafia@gmail.com', 'laafiarime@gmail.com')
                ORDER BY created_at DESC 
                LIMIT 5
            `);

            recentUsers.forEach(user => {
                const authMethod = user.auth_provider === 'google' ? 'Google' : 'email';
                activities.push({
                    description: `New user registered: ${user.name || user.email} (via ${authMethod})`,
                    timestamp: user.created_at,
                    type: 'user_registration'
                });
            });

            // Recent purchases (excluding test emails)
            const [recentPurchases] = await pool.execute(`
                SELECT 
                    ph.amount_gbp, 
                    ph.currency,
                    ph.created_at,
                    u.name,
                    u.email
                FROM payment_history ph
                JOIN users u ON ph.user_id = u.id
                WHERE ph.payment_status = 'succeeded'
                AND u.email NOT IN ('rimelaafia@gmail.com', 'laafiarime@gmail.com')
                ORDER BY ph.created_at DESC 
                LIMIT 5
            `);

            recentPurchases.forEach(purchase => {
                activities.push({
                    description: `Purchase: ${purchase.name || purchase.email} bought ${purchase.currency}${purchase.amount_gbp}`,
                    timestamp: purchase.created_at,
                    type: 'purchase'
                });
            });

            // Recent practice sessions (excluding test emails)
            const [recentSessions] = await pool.execute(`
                SELECT 
                    us.created_at,
                    u.name,
                    u.email
                FROM user_sessions us
                JOIN users u ON us.user_id = u.id
                WHERE us.session_type = 'practice'
                AND u.email NOT IN ('rimelaafia@gmail.com', 'laafiarime@gmail.com')
                ORDER BY us.created_at DESC 
                LIMIT 10
            `);

            recentSessions.forEach(session => {
                activities.push({
                    description: `Practice session: ${session.name || session.email} started a new session`,
                    timestamp: session.created_at,
                    type: 'practice_session'
                });
            });

            // Recent tester activity (job titles entered)
            const [testerActivity] = await pool.execute(`
                SELECT t.job_title, t.created_at, u.email
                FROM tester_job_titles t
                JOIN users u ON t.user_id = u.id
                WHERE u.email NOT IN ('rimelaafia@gmail.com', 'laafiarime@gmail.com')
                ORDER BY t.created_at DESC
                LIMIT 5
            `);

            testerActivity.forEach(item => {
                activities.push({
                    description: `Tester started: ${item.job_title} (${item.email})`,
                    timestamp: item.created_at,
                    type: 'tester_start'
                });
            });

            // Sort all activities by timestamp and limit
            activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            return activities.slice(0, limit);

        } catch (error) {
            logger.error('Error getting recent activity:', error);
            throw error;
        }
    }

    /**
     * Tester insights (job titles entered in test mode)
     */
    async getTesterInsights(dateFilter = 'all_time') {
        try {
            const dateCondition = this.getDateCondition(dateFilter);
            const dateClause = dateCondition ? `AND ${dateCondition.replace('created_at', 't.created_at')}` : '';

            const [summaryRows] = await pool.execute(`
                SELECT 
                    COUNT(*) as total_tests,
                    COUNT(DISTINCT t.user_id) as unique_testers
                FROM tester_job_titles t
                JOIN users u ON t.user_id = u.id
                WHERE u.email NOT IN ('rimelaafia@gmail.com', 'laafiarime@gmail.com')
                ${dateClause}
            `);

            const [topTitles] = await pool.execute(`
                SELECT 
                    COALESCE(NULLIF(t.normalized_title, ''), t.job_title) as title_key,
                    MAX(t.job_title) as display_title,
                    COUNT(*) as count
                FROM tester_job_titles t
                JOIN users u ON t.user_id = u.id
                WHERE u.email NOT IN ('rimelaafia@gmail.com', 'laafiarime@gmail.com')
                ${dateClause}
                GROUP BY title_key
                ORDER BY count DESC
                LIMIT 8
            `);

            const [recentActivity] = await pool.execute(`
                SELECT t.job_title, t.created_at, u.email
                FROM tester_job_titles t
                JOIN users u ON t.user_id = u.id
                WHERE u.email NOT IN ('rimelaafia@gmail.com', 'laafiarime@gmail.com')
                ${dateClause}
                ORDER BY t.created_at DESC
                LIMIT 10
            `);

            const [topQuestionTypes] = await pool.execute(`
                SELECT t.question_type as label, COUNT(*) as count
                FROM tester_job_titles t
                JOIN users u ON t.user_id = u.id
                WHERE u.email NOT IN ('rimelaafia@gmail.com', 'laafiarime@gmail.com')
                AND t.question_type IS NOT NULL AND t.question_type != ''
                ${dateClause}
                GROUP BY t.question_type
                ORDER BY count DESC
                LIMIT 5
            `);

            const [topDifficulties] = await pool.execute(`
                SELECT t.difficulty_level as label, COUNT(*) as count
                FROM tester_job_titles t
                JOIN users u ON t.user_id = u.id
                WHERE u.email NOT IN ('rimelaafia@gmail.com', 'laafiarime@gmail.com')
                AND t.difficulty_level IS NOT NULL AND t.difficulty_level != ''
                ${dateClause}
                GROUP BY t.difficulty_level
                ORDER BY count DESC
                LIMIT 5
            `);

            const [topLanguages] = await pool.execute(`
                SELECT t.language as label, COUNT(*) as count
                FROM tester_job_titles t
                JOIN users u ON t.user_id = u.id
                WHERE u.email NOT IN ('rimelaafia@gmail.com', 'laafiarime@gmail.com')
                AND t.language IS NOT NULL AND t.language != ''
                ${dateClause}
                GROUP BY t.language
                ORDER BY count DESC
                LIMIT 5
            `);

            return {
                totalTests: summaryRows[0]?.total_tests || 0,
                uniqueTesters: summaryRows[0]?.unique_testers || 0,
                topTitles,
                recentActivity,
                topQuestionTypes,
                topDifficulties,
                topLanguages
            };
        } catch (error) {
            logger.error('Error getting tester insights:', error);
            throw error;
        }
    }

    /**
     * Tester users with sessions filtered by tester_job_titles.created_at
     */
    async getTesterUsers(dateFilter = 'all_time') {
        try {
            const dateCondition = this.getDateCondition(dateFilter);
            const testerDateClause = dateCondition
                ? `AND ${dateCondition.replace('created_at', 't.created_at')}`
                : '';

            const [users] = await pool.execute(`
                SELECT 
                    u.id,
                    u.email,
                    u.name,
                    u.role as job_title,
                    u.auth_provider,
                    u.is_verified,
                    u.created_at as signup_date,
                    u.last_login,
                    t_summary.last_test_at
                FROM users u
                JOIN (
                    SELECT user_id, MAX(created_at) as last_test_at
                    FROM tester_job_titles t
                    WHERE 1=1
                    ${testerDateClause}
                    GROUP BY user_id
                ) t_summary ON u.id = t_summary.user_id
                WHERE u.is_verified = TRUE
                AND u.email NOT IN ('rimelaafia@gmail.com', 'laafiarime@gmail.com')
                ORDER BY t_summary.last_test_at DESC
            `);

            const userIds = users.map(user => user.id).filter(Boolean);
            if (userIds.length > 0) {
                const placeholders = userIds.map(() => '?').join(',');
                const [testerRows] = await pool.execute(
                    `
                    SELECT 
                        t.user_id, 
                        t.job_title, 
                        t.question_text, 
                        t.answer_text, 
                        t.difficulty_level,
                        t.question_type,
                        t.language,
                        t.has_additional_info,
                        t.additional_info_length,
                        t.created_at
                    FROM tester_job_titles t
                    WHERE t.user_id IN (${placeholders})
                    ${testerDateClause}
                    ORDER BY t.created_at DESC
                    `,
                    userIds
                );

                const testerMap = new Map();
                testerRows.forEach(row => {
                    if (!testerMap.has(row.user_id)) {
                        testerMap.set(row.user_id, []);
                    }
                    testerMap.get(row.user_id).push(row);
                });

                users.forEach(user => {
                    const testerSessions = testerMap.get(user.id) || [];
                    user.testerSessions = testerSessions;

                    if (!user.job_title || user.job_title.trim() === '' || user.job_title.trim().toLowerCase() === 'n/a') {
                        const latestTesterSession = testerSessions[0];
                        if (latestTesterSession && latestTesterSession.job_title) {
                            user.job_title = latestTesterSession.job_title;
                        }
                    }
                });
            }

            return users;
        } catch (error) {
            logger.error('Error getting tester users:', error);
            throw error;
        }
    }

    /**
     * Get user breakdown statistics
     */
    async getUserBreakdown() {
        try {
            // Users by auth provider (excluding test emails)
            const [authProviders] = await pool.execute(`
                SELECT 
                    COALESCE(auth_provider, 'traditional') as provider,
                    COUNT(*) as count
                FROM users 
                WHERE is_verified = TRUE
                AND email NOT IN ('rimelaafia@gmail.com', 'laafiarime@gmail.com')
                GROUP BY auth_provider
            `);

            // Users by subscription status (excluding test emails)
            const [subscriptionStatus] = await pool.execute(`
                SELECT 
                    CASE 
                        WHEN us.status = 'active' THEN 'Active Subscription'
                        WHEN ph.user_id IS NOT NULL THEN 'Past Customer'
                        ELSE 'Free User'
                    END as status,
                    COUNT(DISTINCT u.id) as count
                FROM users u
                LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
                LEFT JOIN payment_history ph ON u.id = ph.user_id AND ph.payment_status = 'succeeded'
                WHERE u.is_verified = TRUE
                AND u.email NOT IN ('rimelaafia@gmail.com', 'laafiarime@gmail.com')
                GROUP BY status
            `);

            return {
                authProviders: authProviders.map(p => ({
                    label: p.provider === 'google' ? 'Google' : 'Email/Password',
                    value: p.count
                })),
                subscriptionStatus: subscriptionStatus.map(s => ({
                    label: s.status,
                    value: s.count
                }))
            };

        } catch (error) {
            logger.error('Error getting user breakdown:', error);
            throw error;
        }
    }

    /**
     * Helper: Get last 30 days as array of dates
     */
    getLast30Days() {
        const days = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date);
        }
        return days;
    }

    /**
     * Helper: Format date as MM/DD
     */
    formatDate(date) {
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${month}/${day}`;
    }

    /**
     * Helper: Get date condition for SQL queries
     */
    getDateCondition(dateFilter) {
        switch (dateFilter) {
            case 'today':
                return "DATE(created_at) = CURDATE()";
            case 'yesterday':
                return "DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)";
            case 'last_7_days':
                return "created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
            case 'last_30_days':
                return "created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
            case 'last_90_days':
                return "created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)";
            case 'last_year':
                return "created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)";
            case 'all_time':
            default:
                return null;
        }
    }

    /**
     * Get detailed user activity data
     */
    async getUserActivity(dateFilter = 'all_time', limit = null, offset = 0) {
        try {
            const dateCondition = this.getDateCondition(dateFilter);
            const limitClause = typeof limit === 'number' && !Number.isNaN(limit)
                ? `LIMIT ${limit} OFFSET ${offset}`
                : '';
            
            const [users] = await pool.execute(`
                SELECT 
                    u.id,
                    u.email,
                    u.name,
                    u.role as job_title,
                    u.auth_provider,
                    u.is_verified,
                    u.created_at as signup_date,
                    u.last_login,
                    u.stripe_customer_id,
                    u.has_active_subscription,
                    CASE 
                        WHEN u.stripe_customer_id IS NOT NULL AND u.has_active_subscription = 0 THEN 1 
                        ELSE 0 
                    END as has_incomplete_payment,
                    
                    -- Practice sessions count
                    COALESCE(sessions.session_count, 0) as practice_sessions,
                    sessions.last_session_date,
                    
                    -- Payment info
                    payments.total_spent,
                    payments.purchase_count,
                    payments.packages_purchased,
                    payments.last_purchase_date,
                    
                    -- Current subscription
                    sub.status as subscription_status,
                    sub.questions_used,
                    sub.questions_remaining,
                    pkg.name as current_package,
                    pkg.price_gbp as package_price
                    
                FROM users u
                
                -- Practice sessions data
                LEFT JOIN (
                    SELECT 
                        user_id,
                        COUNT(*) as session_count,
                        MAX(created_at) as last_session_date
                    FROM user_sessions 
                    WHERE session_type = 'practice'
                    ${dateCondition ? `AND ${dateCondition.replace('created_at', 'user_sessions.created_at')}` : ''}
                    GROUP BY user_id
                ) sessions ON u.id = sessions.user_id
                
                -- Payment data
                LEFT JOIN (
                    SELECT 
                        user_id,
                        SUM(amount_gbp) as total_spent,
                        COUNT(*) as purchase_count,
                        GROUP_CONCAT(DISTINCT package_name SEPARATOR ', ') as packages_purchased,
                        MAX(created_at) as last_purchase_date
                    FROM payment_history 
                    WHERE payment_status = 'succeeded'
                    ${dateCondition ? `AND ${dateCondition.replace('created_at', 'payment_history.created_at')}` : ''}
                    GROUP BY user_id
                ) payments ON u.id = payments.user_id
                
                -- Current subscription
                LEFT JOIN user_subscriptions sub ON u.id = sub.user_id AND sub.status = 'active'
                LEFT JOIN packages pkg ON sub.package_id = pkg.id
                
                WHERE u.is_verified = TRUE
                AND u.email NOT IN ('rimelaafia@gmail.com', 'laafiarime@gmail.com')
                ${dateCondition ? `AND ${dateCondition.replace('created_at', 'u.created_at')}` : ''}
                
                ORDER BY u.created_at DESC
                ${limitClause}
            `);

            const userIds = users.map(user => user.id).filter(Boolean);
            if (userIds.length > 0) {
                const placeholders = userIds.map(() => '?').join(',');
                const testerDateClause = dateCondition ? `AND ${dateCondition.replace('created_at', 'tester_job_titles.created_at')}` : '';
                const [testerRows] = await pool.execute(
                    `
                    SELECT 
                        user_id, 
                        job_title, 
                        question_text, 
                        answer_text, 
                        difficulty_level,
                        question_type,
                        language,
                        has_additional_info,
                        additional_info_length,
                        created_at
                    FROM tester_job_titles
                    WHERE user_id IN (${placeholders})
                    ${testerDateClause}
                    ORDER BY created_at DESC
                    `,
                    userIds
                );

                const testerMap = new Map();
                testerRows.forEach(row => {
                    if (!testerMap.has(row.user_id)) {
                        testerMap.set(row.user_id, []);
                    }
                    testerMap.get(row.user_id).push(row);
                });

                users.forEach(user => {
                    const testerSessions = testerMap.get(user.id) || [];
                    user.testerSessions = testerSessions;

                    if (!user.job_title || user.job_title.trim() === '' || user.job_title.trim().toLowerCase() === 'n/a') {
                        const latestTesterSession = testerSessions[0];
                        if (latestTesterSession && latestTesterSession.job_title) {
                            user.job_title = latestTesterSession.job_title;
                        }
                    }
                });
            }
            
            return users;

        } catch (error) {
            logger.error('Error getting user activity:', error);
            throw error;
        }
    }

    /**
     * Get guest test sessions
     */
    async getGuestSessions(dateFilter = 'all_time') {
        try {
            const dateCondition = this.getDateCondition(dateFilter);
            const whereClause = dateCondition ? `WHERE ${dateCondition.replace('created_at', 'g.created_at')}` : '';
            const [sessions] = await pool.execute(`
                SELECT g.guest_id, g.created_at
                FROM guest_test_sessions g
                ${whereClause}
                ORDER BY g.created_at DESC
                LIMIT 100
            `);

            if (sessions.length === 0) return [];

            // Fetch tester_job_titles for each guest_id
            const guestIds = sessions.map(s => s.guest_id);
            const placeholders = guestIds.map(() => '?').join(',');
            const [details] = await pool.execute(`
                SELECT guest_id, job_title, question_type, difficulty_level, language,
                       question_text, answer_text, has_additional_info, created_at
                FROM tester_job_titles
                WHERE guest_id IN (${placeholders})
                ORDER BY created_at ASC
            `, guestIds);

            const detailMap = new Map();
            details.forEach(row => {
                if (!detailMap.has(row.guest_id)) detailMap.set(row.guest_id, []);
                detailMap.get(row.guest_id).push(row);
            });

            return sessions.map(s => ({
                guest_id: s.guest_id,
                created_at: s.created_at,
                details: detailMap.get(s.guest_id) || [],
            }));
        } catch (error) {
            logger.error('Error getting guest sessions:', error);
            throw error;
        }
    }

    /**
     * Get system health metrics
     */
    async getSystemHealth() {
        try {
            // Database connection test
            const [dbTest] = await pool.execute('SELECT 1 as test');
            const dbHealthy = dbTest.length > 0;

            // Get database size info
            const [dbSize] = await pool.execute(`
                SELECT 
                    table_name,
                    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
                FROM information_schema.tables
                WHERE table_schema = DATABASE()
                ORDER BY (data_length + index_length) DESC
                LIMIT 10
            `);

            return {
                database: {
                    status: dbHealthy ? 'healthy' : 'unhealthy',
                    tables: dbSize
                },
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Error getting system health:', error);
            return {
                database: {
                    status: 'unhealthy',
                    error: error.message
                },
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = new AdminService();
