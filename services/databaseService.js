const { pool } = require('../config/database');
const winston = require('winston');
// Note: stripeService import will be added lazily to avoid circular dependencies

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

class DatabaseService {
    // User operations - Legacy support for users without passwords
    async createOrUpdateUser(email, name = null) {
        try {
            // Check if user exists
            const [existingUsers] = await pool.execute(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );

            if (existingUsers.length > 0) {
                // User exists, just update name if provided
                if (name) {
                    await pool.execute(
                        'UPDATE users SET name = ?, updated_at = NOW() WHERE email = ?',
                        [name, email]
                    );
                }
                return existingUsers[0].id;
            } else {
                // Create new user without password (legacy support)
                const [result] = await pool.execute(
                    `INSERT INTO users (email, name, created_at, updated_at) VALUES (?, ?, NOW(), NOW())`,
                    [email, name]
                );
                return result.insertId;
            }
        } catch (error) {
            logger.error('Error creating/updating user:', error);
            throw error;
        }
    }

    // Package operations
    async getAllPackages() {
        try {
            const [packages] = await pool.execute(
                'SELECT * FROM packages WHERE is_active = TRUE ORDER BY price_gbp ASC'
            );
            return packages;
        } catch (error) {
            logger.error('Error getting packages:', error);
            throw error;
        }
    }

    async getPackageById(packageId) {
        try {
            const [packages] = await pool.execute(
                'SELECT * FROM packages WHERE id = ? AND is_active = TRUE',
                [packageId]
            );
            return packages[0] || null;
        } catch (error) {
            logger.error('Error getting package by ID:', error);
            throw error;
        }
    }

    // Subscription operations
    async createUserSubscription(userId, packageId, stripeSubscriptionId, stripeCustomerId) {
        try {
            // First, deactivate any existing active subscriptions
            await pool.execute(
                `UPDATE user_subscriptions SET status = 'inactive' WHERE user_id = ? AND status = 'active'`,
                [userId]
            );

            // Get package details
            const packageData = await this.getPackageById(packageId);
            if (!packageData) {
                throw new Error('Package not found');
            }

            // Create new subscription
            const [result] = await pool.execute(
                `INSERT INTO user_subscriptions 
                (user_id, package_id, stripe_subscription_id, stripe_customer_id, status, questions_used, questions_remaining, current_period_start, current_period_end)
                VALUES (?, ?, ?, ?, 'active', 0, ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH))`,
                [userId, packageId, stripeSubscriptionId, stripeCustomerId, packageData.questions_per_month]
            );

            return result.insertId;
        } catch (error) {
            logger.error('Error creating user subscription:', error);
            throw error;
        }
    }

    async getUserActiveSubscription(userId) {
        try {
            const [subscriptions] = await pool.execute(
                `SELECT us.*, p.name as package_name, p.questions_per_month, p.price_gbp 
                FROM user_subscriptions us 
                JOIN packages p ON us.package_id = p.id 
                WHERE us.user_id = ? AND us.status = 'active' 
                ORDER BY us.created_at DESC LIMIT 1`,
                [userId]
            );
            return subscriptions[0] || null;
        } catch (error) {
            logger.error('Error getting user active subscription:', error);
            throw error;
        }
    }

    async updateSubscriptionUsage(subscriptionId, questionsUsed = 1) {
        try {
            await pool.execute(
                `UPDATE user_subscriptions 
                SET questions_used = questions_used + ?, 
                    questions_remaining = questions_remaining - ?, 
                    updated_at = NOW() 
                WHERE id = ? AND questions_remaining >= ?`,
                [questionsUsed, questionsUsed, subscriptionId, questionsUsed]
            );
            
            // Check if update was successful (affected rows > 0)
            const [result] = await pool.execute(
                'SELECT questions_remaining FROM user_subscriptions WHERE id = ?',
                [subscriptionId]
            );
            
            return result[0]?.questions_remaining >= 0;
        } catch (error) {
            logger.error('Error updating subscription usage:', error);
            throw error;
        }
    }

    // Unified session operations - Just generate UUID, don't insert yet
    async createSession(userId, sessionType = 'practice_mode', jobDescription = null, resume = null, subscriptionId = null) {
        try {
            // Generate a session UUID for grouping multi-question sessions
            const sessionUuid = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            // Don't insert anything yet - we'll insert when we have actual questions
            // This avoids the NOT NULL constraint issues
            logger.info(`Generated session UUID: ${sessionUuid} for user ${userId}`);
            
            return sessionUuid; // Return UUID for use in saveSession
        } catch (error) {
            logger.error('Error creating session:', error);
            throw error;
        }
    }

    async createPracticeSession(userId, sessionType, questionText, subscriptionId = null, targetRole = null, industry = null, jobDescription = null, resumeContent = null) {
        try {
            const sessionUuid = `practice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            const [result] = await pool.execute(
                `INSERT INTO user_sessions 
                (user_id, subscription_id, session_type, session_uuid, question_text, target_role, industry, job_description, resume_content)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, subscriptionId, sessionType, sessionUuid, questionText, targetRole, industry, jobDescription, resumeContent]
            );
            return result.insertId;
        } catch (error) {
            logger.error('Error creating practice session:', error);
            throw error;
        }
    }

    async updatePracticeSession(sessionId, userResponse, aiFeedback, confidenceScore = null, improvementAreas = null, strengths = null, suggestions = null, tips = null, duration = 0) {
        try {
            await pool.execute(
                `UPDATE user_sessions 
                SET answer_text = ?, ai_feedback = ?, confidence_score = ?, score = ?,
                    improvement_areas = ?, strengths_identified = ?, suggested_improvements = ?, 
                    interview_tips = ?, session_duration = ?, updated_at = NOW()
                WHERE id = ?`,
                [
                    userResponse, 
                    aiFeedback, 
                    confidenceScore,
                    confidenceScore, // Use confidence_score as score too
                    JSON.stringify(improvementAreas), 
                    JSON.stringify(strengths), 
                    JSON.stringify(suggestions), 
                    JSON.stringify(tips), 
                    duration, 
                    sessionId
                ]
            );
        } catch (error) {
            logger.error('Error updating practice session:', error);
            throw error;
        }
    }

    async getUserPracticeSessions(userId, limit = 10, offset = 0) {
        try {
            const [sessions] = await pool.execute(
                `SELECT us.*, p.name as package_name, p.questions_per_month
                FROM user_sessions us
                LEFT JOIN user_subscriptions sub ON us.subscription_id = sub.id
                LEFT JOIN packages p ON sub.package_id = p.id
                WHERE us.user_id = ? AND us.session_type IN ('tester', 'full')
                ORDER BY us.created_at DESC
                LIMIT ? OFFSET ?`,
                [userId, limit, offset]
            );
            return sessions;
        } catch (error) {
            logger.error('Error getting user practice sessions:', error);
            throw error;
        }
    }

    // Question usage tracking
    async recordQuestionUsage(userId, subscriptionId, practiceSessionId, questionCount = 1) {
        try {
            await pool.execute(
                `INSERT INTO question_usage (user_id, subscription_id, practice_session_id, question_count)
                VALUES (?, ?, ?, ?)`,
                [userId, subscriptionId, practiceSessionId, questionCount]
            );
        } catch (error) {
            logger.error('Error recording question usage:', error);
            throw error;
        }
    }

    async recordTesterJobTitle(userId, jobTitle, normalizedTitle = null, metadata = {}, guestId = null) {
        try {
            const {
                difficultyLevel = null,
                questionType = null,
                language = null,
                hasAdditionalInfo = 0,
                additionalInfoLength = 0
            } = metadata;

            await pool.execute(
                `INSERT INTO tester_job_titles
                (user_id, guest_id, job_title, normalized_title, difficulty_level, question_type, language, has_additional_info, additional_info_length, question_text, answer_text)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId || null,
                    guestId || null,
                    jobTitle,
                    normalizedTitle,
                    difficultyLevel,
                    questionType,
                    language,
                    hasAdditionalInfo ? 1 : 0,
                    additionalInfoLength || 0,
                    metadata.questionText || null,
                    metadata.answerText || null
                ]
            );
        } catch (error) {
            logger.error('Error recording tester job title:', error);
            throw error;
        }
    }

    async updateTesterJobTitleResponse(identifier, questionText, answerText, isGuest = false) {
        try {
            const column = isGuest ? 'guest_id' : 'user_id';
            await pool.execute(
                `UPDATE tester_job_titles
                 SET question_text = ?, answer_text = ?
                 WHERE ${column} = ?
                 ORDER BY created_at DESC
                 LIMIT 1`,
                [questionText, answerText, identifier]
            );
        } catch (error) {
            logger.error('Error updating tester job title response:', error);
            throw error;
        }
    }

    async updateTesterJobTitleQuestion(identifier, questionText, isGuest = false) {
        try {
            const column = isGuest ? 'guest_id' : 'user_id';
            await pool.execute(
                `UPDATE tester_job_titles
                 SET question_text = IF(question_text IS NULL OR question_text = '', ?, question_text)
                 WHERE ${column} = ?
                 ORDER BY created_at DESC
                 LIMIT 1`,
                [questionText, identifier]
            );
        } catch (error) {
            logger.error('Error updating tester job title question:', error);
            throw error;
        }
    }

    // User access control helpers
    async getUserAccessLevel(userId) {
        try {
            const subscription = await this.getUserActiveSubscription(userId);
            
            if (!subscription) {
                return {
                    accessLevel: 'free',
                    canGenerateQuestions: false,
                    questionsRemaining: 0,
                    subscriptionDetails: null
                };
            }

            return {
                accessLevel: 'paid',
                canGenerateQuestions: subscription.questions_remaining > 0,
                questionsRemaining: subscription.questions_remaining,
                questionsTotal: subscription.questions_per_month,
                subscriptionDetails: subscription
            };
        } catch (error) {
            logger.error('Error getting user access level:', error);
            throw error;
        }
    }

    // Get tester question
    async getTesterQuestion(targetRole = 'your target role') {
        return `Can you tell me about yourself and your experience, and how relevant can it be to the role ${targetRole}?`;
    }

    // Session operations (now using unified table)
    async endSession(sessionUuid) {
        try {
            await pool.execute(
                'UPDATE user_sessions SET ended_at = NOW() WHERE session_uuid = ?',
                [sessionUuid]
            );
        } catch (error) {
            logger.error('Error ending session:', error);
            throw error;
        }
    }

    // Removed savePracticeQuestionAndAnswer - using saveInterviewProgress instead


    // Dashboard data operations (using unified table)
    async getUserProgress(userId) {
        try {
            // Get overall stats from unified table (including retries)
            const [stats] = await pool.execute(`
                SELECT 
                    COUNT(DISTINCT us.session_uuid) as total_sessions,
                    COUNT(DISTINCT us.id) as total_questions_answered,
                    COUNT(DISTINCT CONCAT(us.session_uuid, '-', us.question_number)) as unique_questions,
                    SUM(CASE WHEN us.is_retry = 1 THEN 1 ELSE 0 END) as total_retries,
                    AVG(us.score) as avg_score,
                    MAX(us.score) as best_score,
                    MAX(us.created_at) as last_session_date
                FROM user_sessions us
                WHERE us.user_id = ? AND us.question_text IS NOT NULL AND us.score IS NOT NULL
                GROUP BY us.user_id
            `, [userId]);

            // Get score trend over time
            const [scoreTrend] = await pool.execute(`
                SELECT 
                    DATE(us.created_at) as date,
                    AVG(us.score) as avg_score,
                    COUNT(*) as questions_answered
                FROM user_sessions us
                WHERE us.user_id = ? AND us.score IS NOT NULL
                GROUP BY DATE(us.created_at)
                ORDER BY date DESC
                LIMIT 30
            `, [userId]);

            // Get recent simulator sessions
            const [simulatorSessions] = await pool.execute(`
                SELECT
                    id, session_uuid, created_at,
                    total_questions, score, session_duration,
                    question_type, difficulty_level, language, ai_feedback
                FROM user_sessions
                WHERE user_id = ? AND session_type = 'simulator'
                ORDER BY created_at DESC
                LIMIT 10
            `, [userId]);

            // Get recent sessions
            const [recentSessions] = await pool.execute(`
                SELECT
                    us.session_uuid as id,
                    us.session_type,
                    MIN(us.created_at) as started_at,
                    MAX(us.updated_at) as ended_at,
                    COUNT(DISTINCT us.id) as questions_count,
                    AVG(us.score) as avg_score
                FROM user_sessions us
                WHERE us.user_id = ? AND us.question_text IS NOT NULL
                GROUP BY us.session_uuid, us.session_type
                ORDER BY started_at DESC
                LIMIT 10
            `, [userId]);

            // Get performance by question type (including retry improvement)
            const [performanceByType] = await pool.execute(`
                SELECT 
                    us.question_type,
                    COUNT(*) as count,
                    AVG(us.score) as avg_score,
                    SUM(CASE WHEN us.is_retry = 1 THEN 1 ELSE 0 END) as retry_count,
                    AVG(CASE WHEN us.is_retry = 0 THEN us.score ELSE NULL END) as first_attempt_avg,
                    AVG(CASE WHEN us.is_retry = 1 THEN us.score ELSE NULL END) as retry_avg
                FROM user_sessions us
                WHERE us.user_id = ? AND us.question_type IS NOT NULL AND us.score IS NOT NULL
                GROUP BY us.question_type
            `, [userId]);
            
            // Get retry insights
            const [retryInsights] = await pool.execute(`
                SELECT 
                    COUNT(DISTINCT CASE WHEN us.is_retry = 1 THEN CONCAT(us.session_uuid, '-', us.question_number) END) as questions_retried,
                    AVG(CASE WHEN us.is_retry = 1 THEN us.score - first.score ELSE NULL END) as avg_score_improvement,
                    MAX(CASE WHEN us.is_retry = 1 THEN us.score - first.score ELSE NULL END) as best_improvement,
                    COUNT(CASE WHEN us.is_retry = 1 AND us.score > first.score THEN 1 END) as improved_on_retry,
                    COUNT(CASE WHEN us.is_retry = 1 AND us.score = first.score THEN 1 END) as same_on_retry,
                    COUNT(CASE WHEN us.is_retry = 1 AND us.score < first.score THEN 1 END) as worse_on_retry
                FROM user_sessions us
                LEFT JOIN user_sessions first ON first.id = us.original_question_id
                WHERE us.user_id = ?
            `, [userId]);
            
            // Get detailed retry comparisons (original vs retry for each question)
            const [retryComparisons] = await pool.execute(`
                SELECT 
                    first.question_text,
                    first.question_type,
                    first.score as original_score,
                    retry.score as retry_score,
                    (retry.score - first.score) as score_change,
                    first.created_at as original_date,
                    retry.created_at as retry_date,
                    TIMESTAMPDIFF(MINUTE, first.created_at, retry.created_at) as minutes_between_attempts
                FROM user_sessions retry
                INNER JOIN user_sessions first ON first.id = retry.original_question_id
                WHERE retry.user_id = ? 
                AND retry.is_retry = 1
                ORDER BY retry.created_at DESC
                LIMIT 20
            `, [userId]);

            // Get average delivery metrics (voice answers only, first attempts)
            const [deliveryStats] = await pool.execute(`
                SELECT
                    ROUND(AVG(wpm)) as avg_wpm,
                    ROUND(AVG(filler_count)) as avg_fillers,
                    ROUND(AVG(pause_count)) as avg_pauses,
                    ROUND(AVG(longest_pause_ms)) as avg_longest_pause_ms,
                    ROUND(AVG(word_count)) as avg_word_count,
                    COUNT(CASE WHEN wpm IS NOT NULL THEN 1 END) as voice_answers
                FROM user_sessions
                WHERE user_id = ? AND is_retry = 0 AND wpm IS NOT NULL
            `, [userId]);

            // Get delivery trend over time (daily averages, voice answers only)
            const [deliveryTrend] = await pool.execute(`
                SELECT
                    DATE(created_at) as date,
                    ROUND(AVG(wpm)) as avg_wpm,
                    ROUND(AVG(filler_count)) as avg_fillers,
                    ROUND(AVG(pause_count)) as avg_pauses,
                    COUNT(*) as answers
                FROM user_sessions
                WHERE user_id = ? AND is_retry = 0 AND wpm IS NOT NULL
                GROUP BY DATE(created_at)
                ORDER BY date ASC
                LIMIT 30
            `, [userId]);

            // Calculate improvement rate using previous average score (stored in user_progress)
            let improvementRate = 0;
            let oldAvgScore = null;
            const [progressRows] = await pool.execute(
                'SELECT old_avg_score FROM user_progress WHERE user_id = ? LIMIT 1',
                [userId]
            );
            if (progressRows.length > 0 && progressRows[0].old_avg_score !== null) {
                oldAvgScore = parseFloat(progressRows[0].old_avg_score);
            }
            const currentAvgScore = parseFloat(stats[0]?.avg_score) || 0;
            if (oldAvgScore && oldAvgScore > 0) {
                improvementRate = ((currentAvgScore - oldAvgScore) / oldAvgScore) * 100;
            }

            return {
                overview: stats[0] || {},
                scoreTrend: scoreTrend.reverse(), // Chronological order
                recentSessions,
                simulatorSessions,
                performanceByType,
                improvementRate,
                oldAvgScore,
                retryInsights: retryInsights[0] || {},
                retryComparisons,
                deliveryStats: deliveryStats[0] || {},
                deliveryTrend
            };
        } catch (error) {
            logger.error('Error getting user progress:', error);
            throw error;
        }
    }

    async getSessionDetails(sessionUuid) {
        try {
            // Get session info from unified table
            const [sessionInfo] = await pool.execute(`
                SELECT 
                    session_uuid as id,
                    user_id,
                    session_type,
                    MIN(started_at) as started_at,
                    MAX(ended_at) as ended_at,
                    job_description,
                    resume_content as resume
                FROM user_sessions 
                WHERE session_uuid = ?
                GROUP BY session_uuid, user_id, session_type, job_description, resume_content
            `, [sessionUuid]);

            if (sessionInfo.length === 0) {
                return null;
            }

            // Get questions and answers for the session
            const [questionsAndAnswers] = await pool.execute(`
                SELECT 
                    us.id as question_id,
                    us.question_number,
                    us.question_text,
                    us.question_type,
                    us.id as answer_id,
                    us.answer_text,
                    us.score,
                    us.ai_feedback as feedback,
                    1 as attempt_number,
                    us.created_at as answered_at
                FROM user_sessions us
                WHERE us.session_uuid = ? AND us.question_text IS NOT NULL
                ORDER BY us.question_number
            `, [sessionUuid]);

            return {
                session: sessionInfo[0],
                questionsAndAnswers
            };
        } catch (error) {
            logger.error('Error getting session details:', error);
            throw error;
        }
    }

    // Update user progress (call after each session)
    async updateUserProgress(userId) {
        try {
            const progress = await this.getUserProgress(userId);
            const [existingProgress] = await pool.execute(
                'SELECT avg_score FROM user_progress WHERE user_id = ? LIMIT 1',
                [userId]
            );
            const previousAvgScore = existingProgress.length > 0 && existingProgress[0].avg_score !== null
                ? parseFloat(existingProgress[0].avg_score)
                : null;
            const currentAvgScore = parseFloat(progress.overview.avg_score) || 0;
            const improvementRate = previousAvgScore && previousAvgScore > 0
                ? ((currentAvgScore - previousAvgScore) / previousAvgScore) * 100
                : 0;
            
            await pool.execute(`
                INSERT INTO user_progress 
                (user_id, total_sessions, total_practice_questions, avg_score, old_avg_score, best_score, improvement_rate, last_session_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                total_sessions = VALUES(total_sessions),
                total_practice_questions = VALUES(total_practice_questions),
                avg_score = VALUES(avg_score),
                old_avg_score = VALUES(old_avg_score),
                best_score = VALUES(best_score),
                improvement_rate = VALUES(improvement_rate),
                last_session_date = VALUES(last_session_date),
                updated_at = NOW()
            `, [
                userId,
                progress.overview.total_sessions || 0,
                progress.overview.total_questions || 0,
                progress.overview.avg_score || null,
                previousAvgScore,
                progress.overview.best_score || null,
                improvementRate,
                progress.overview.last_session_date || null
            ]);
        } catch (error) {
            logger.error('Error updating user progress:', error);
            throw error;
        }
    }

    // Get the original question ID for retry tracking
    async getOriginalQuestionId(userId, sessionUuid, questionNumber) {
        try {
            const [original] = await pool.execute(`
                SELECT id FROM user_sessions 
                WHERE user_id = ? 
                AND session_uuid = ? 
                AND question_number = ? 
                AND is_retry = 0
                ORDER BY created_at ASC 
                LIMIT 1
            `, [userId, sessionUuid, questionNumber]);
            
            if (original && original.length > 0) {
                return original[0].id;
            }
            return null;
        } catch (error) {
            logger.error('Error getting original question ID:', error);
            return null;
        }
    }

    // Save session data (unified method for all session types)
    async saveSession({
        userId,
        sessionUuid,
        questionNumber = 1,
        totalQuestions = 5,
        sessionType = 'practice_mode',
        subscriptionId = null,
        // Retry tracking
        isRetry = false,
        attemptNumber = 1,
        originalQuestionId = null,
        // Configuration
        currentRole = '',
        experienceYears = '',
        detectedRole = '',
        detectedCompany = '',
        detectedIndustry = '',
        difficultyLevel = 'intermediate',
        questionType = '',
        language = 'english',
        companyName = '',
        additionalInfo = '',
        targetRole = '',
        industry = '',
        // Content
        jobDescription = '',
        resumeContent = '',
        questionText = '',
        answerText = '',
        answerMode = 'text',
        answerDuration = 0,
        // Delivery insights
        wpm = null,
        wordCount = null,
        fillerCount = null,
        pauseCount = null,
        longestPauseMs = null,
        // Scoring and feedback
        score = null,
        scoreComparison = '',
        aiFeeback = '',
        confidenceScore = null,
        strengths = '',
        improvements = '',
        betterResponse = '',
        tips = '',
        // Legacy JSON fields (for backward compatibility)
        improvementAreas = null,
        strengthsIdentified = null,
        suggestedImprovements = null,
        interviewTips = null,
        // Timing
        sessionDuration = 0,
        fullFeedback = ''
    }) {
        try {
            const [result] = await pool.execute(`
                INSERT INTO user_sessions (
                    user_id, subscription_id, session_type, session_uuid, 
                    question_number, total_questions,
                    current_role, experience_years, detected_role, detected_company, 
                    detected_industry, difficulty_level, question_type, language,
                    company_name, additional_info, target_role, industry,
                    job_description, resume_content, question_text,
                    is_retry, attempt_number, original_question_id,
                    answer_text, answer_mode, answer_duration,
                    wpm, word_count, filler_count, pause_count, longest_pause_ms,
                    score, score_comparison, ai_feedback, confidence_score,
                    strengths, improvements, better_response, tips,
                    improvement_areas, strengths_identified, suggested_improvements, interview_tips,
                    session_duration
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                userId, subscriptionId, sessionType, sessionUuid,
                questionNumber, totalQuestions,
                currentRole, experienceYears, detectedRole, detectedCompany,
                detectedIndustry, difficultyLevel, questionType, language,
                companyName, additionalInfo, targetRole, industry,
                jobDescription, resumeContent, questionText,
                isRetry, attemptNumber, originalQuestionId,
                answerText, answerMode, answerDuration,
                wpm, wordCount, fillerCount, pauseCount, longestPauseMs,
                score, scoreComparison, fullFeedback || aiFeeback, confidenceScore,
                strengths, improvements, betterResponse, tips,
                improvementAreas ? JSON.stringify(improvementAreas) : null,
                strengthsIdentified ? JSON.stringify(strengthsIdentified) : null,
                suggestedImprovements ? JSON.stringify(suggestedImprovements) : null,
                interviewTips ? JSON.stringify(interviewTips) : null,
                sessionDuration
            ]);
            
            // Question usage tracking is now handled in the requestAIQuestion socket handler when questions are generated
            
            logger.info(`Saved session data for user ${userId}, question ${questionNumber}, attempt ${attemptNumber}, retry: ${isRetry}`);
            return { insertId: result.insertId };
        } catch (error) {
            logger.error('Error saving session data:', error);
            throw error;
        }
    }

    // Backward compatibility method
    async saveInterviewProgress(data) {
        return this.saveSession({
            ...data,
            sessionUuid: `session-${data.sessionId}`, // Convert old sessionId to UUID format
            fullFeedback: data.fullFeedback
        });
    }

    // Get user's detailed interview progress for dashboard (unified)
    async getUserInterviewProgress(userId, limit = 50, offset = 0) {
        try {
            const [progress] = await pool.execute(`
                SELECT * FROM user_sessions
                WHERE user_id = ? AND question_text IS NOT NULL
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            `, [userId, limit, offset]);
            
            return progress;
        } catch (error) {
            logger.error('Error getting user interview progress:', error);
            throw error;
        }
    }

    // Get recent questions from last N sessions to avoid repetition
    async getRecentQuestions(userId, sessionCount = 5) {
        try {
            // First get the last N unique session UUIDs
            const [recentSessions] = await pool.execute(`
                SELECT DISTINCT session_uuid 
                FROM user_sessions 
                WHERE user_id = ? 
                AND question_text IS NOT NULL 
                AND session_type IN ('practice_mode', 'full')
                ORDER BY created_at DESC 
                LIMIT ?
            `, [userId, sessionCount]);
            
            if (recentSessions.length === 0) {
                return [];
            }
            
            // Get all questions from these sessions
            const sessionUuids = recentSessions.map(s => s.session_uuid);
            const placeholders = sessionUuids.map(() => '?').join(',');
            
            const [questions] = await pool.execute(`
                SELECT 
                    question_text,
                    question_type,
                    created_at,
                    session_uuid
                FROM user_sessions
                WHERE session_uuid IN (${placeholders})
                AND question_text IS NOT NULL
                AND is_retry = 0
                ORDER BY created_at DESC
            `, sessionUuids);
            
            return questions;
        } catch (error) {
            logger.error('Error getting recent questions:', error);
            return [];
        }
    }

    // Get aggregated stats from unified sessions table
    async getUserInterviewStats(userId) {
        try {
            const [stats] = await pool.execute(`
                SELECT 
                    COUNT(DISTINCT session_uuid) as total_sessions,
                    COUNT(*) as total_questions,
                    AVG(score) as avg_score,
                    MAX(score) as best_score,
                    MIN(score) as worst_score,
                    AVG(answer_duration) as avg_answer_duration,
                    COUNT(DISTINCT difficulty_level) as difficulty_levels_attempted,
                    COUNT(DISTINCT question_type) as question_types_attempted,
                    GROUP_CONCAT(DISTINCT detected_role) as roles_practiced,
                    GROUP_CONCAT(DISTINCT detected_company) as companies_practiced
                FROM user_sessions
                WHERE user_id = ? AND question_text IS NOT NULL AND score IS NOT NULL
            `, [userId]);
            
            // Get performance by difficulty level
            const [difficultyStats] = await pool.execute(`
                SELECT 
                    difficulty_level,
                    COUNT(*) as count,
                    AVG(score) as avg_score
                FROM user_sessions
                WHERE user_id = ? AND difficulty_level IS NOT NULL AND score IS NOT NULL
                GROUP BY difficulty_level
            `, [userId]);
            
            // Get performance by question type
            const [typeStats] = await pool.execute(`
                SELECT 
                    question_type,
                    COUNT(*) as count,
                    AVG(score) as avg_score
                FROM user_sessions
                WHERE user_id = ? AND question_type IS NOT NULL AND score IS NOT NULL
                GROUP BY question_type
            `, [userId]);
            
            return {
                overall: stats[0] || {},
                byDifficulty: difficultyStats,
                byType: typeStats
            };
        } catch (error) {
            logger.error('Error getting user interview stats:', error);
            throw error;
        }
    }
}

module.exports = new DatabaseService();
