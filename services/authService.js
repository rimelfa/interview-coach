const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');
const winston = require('winston');
const { OAuth2Client } = require('google-auth-library');

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

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const SALT_ROUNDS = 12;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

class AuthService {
    /**
     * Hash a password
     */
    async hashPassword(password) {
        return await bcrypt.hash(password, SALT_ROUNDS);
    }

    /**
     * Compare password with hash
     */
    async comparePassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }

    /**
     * Generate JWT token
     */
    generateToken(user) {
        return jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                name: user.name 
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
    }

    /**
     * Verify JWT token
     */
    verifyToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            return null;
        }
    }

    /**
     * Generate verification token
     */
    generateVerificationToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Register new user
     */
    async register(userData) {
        const { email, password, name, country, role, experienceYears } = userData;
        
        try {
            // Check if user already exists
            const [existingUsers] = await pool.execute(
                'SELECT id, is_verified FROM users WHERE email = ?',
                [email]
            );

            if (existingUsers.length > 0) {
                const existingUser = existingUsers[0];
                
                // If user exists but is not verified, allow them to re-register
                // This will update their information and resend verification
                if (!existingUser.is_verified) {
                    // Delete the unverified user account
                    await pool.execute('DELETE FROM users WHERE id = ? AND is_verified = FALSE', [existingUser.id]);
                    logger.info(`Deleted unverified account for re-registration: ${email}`);
                } else {
                    // User exists and is verified, don't allow re-registration
                    throw new Error('User already exists with this email');
                }
            }

            // Validate password strength
            if (!this.validatePassword(password)) {
                throw new Error('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
            }

            // Hash password
            const passwordHash = await this.hashPassword(password);
            const verificationToken = this.generateVerificationToken();

            // Sanitize optional fields - convert undefined to null
            const sanitizedCountry = country || null;
            const sanitizedRole = role || null;
            const sanitizedExperienceYears = experienceYears || null;

            // Set verification token expiration to 24 hours from now
            const verificationExpires = new Date();
            verificationExpires.setHours(verificationExpires.getHours() + 24);
            
            // Insert user
            const [result] = await pool.execute(`
                INSERT INTO users (email, password_hash, name, country, role, experience_years, verification_token, verification_token_expires) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [email, passwordHash, name, sanitizedCountry, sanitizedRole, sanitizedExperienceYears, verificationToken, verificationExpires]);

            const userId = result.insertId;

            // Get the created user (without password)
            const [users] = await pool.execute(`
                SELECT id, email, name, country, role, experience_years, is_verified, created_at 
                FROM users WHERE id = ?
            `, [userId]);

            const user = users[0];

            // Generate JWT token
            const token = this.generateToken(user);

            logger.info(`New user registered: ${email}`);

            return {
                user,
                token,
                verificationToken
            };

        } catch (error) {
            logger.error('Registration error:', error);
            throw error;
        }
    }

    /**
     * Login user
     */
    async login(email, password) {
        try {
            // Get user with password hash
            const [users] = await pool.execute(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );

            if (users.length === 0) {
                throw new Error('Invalid email or password');
            }

            const user = users[0];

            // Check if user signed up with Google and has no password
            if (!user.password_hash && user.auth_provider === 'google') {
                throw new Error('This account uses Google Sign-In. Please use the "Sign in with Google" button instead.');
            }

            // Check password
            const isValidPassword = await this.comparePassword(password, user.password_hash);
            
            if (!isValidPassword) {
                throw new Error('Invalid email or password');
            }

            // Update last login
            await pool.execute(
                'UPDATE users SET last_login = NOW() WHERE id = ?',
                [user.id]
            );

            // Remove password hash from user object
            delete user.password_hash;
            delete user.verification_token;
            delete user.reset_token;
            delete user.reset_token_expires;

            // Generate JWT token
            const token = this.generateToken(user);

            logger.info(`User logged in: ${email}`);

            return {
                user,
                token
            };

        } catch (error) {
            logger.error('Login error:', error);
            throw error;
        }
    }

    /**
     * Get user by ID
     */
    async getUserById(userId) {
        try {
            const [users] = await pool.execute(`
                SELECT id, email, name, country, company, role, experience_years, is_verified, last_login, created_at,
                       resume_content, resume_filename, resume_uploaded_at
                FROM users WHERE id = ?
            `, [userId]);

            return users[0] || null;
        } catch (error) {
            logger.error('Get user error:', error);
            throw error;
        }
    }

    /**
     * Update user profile
     */
    async updateProfile(userId, updateData) {
        try {
            const { name, role, experienceYears } = updateData;

            await pool.execute(`
                UPDATE users
                SET name = ?, role = ?, experience_years = ?, updated_at = NOW()
                WHERE id = ?
            `, [name, role, experienceYears, userId]);

            return await this.getUserById(userId);
        } catch (error) {
            logger.error('Profile update error:', error);
            throw error;
        }
    }

    /**
     * Update user resume content
     */
    async updateResume(userId, resumeContent, filename) {
        try {
            await pool.execute(`
                UPDATE users 
                SET resume_content = ?, resume_filename = ?, resume_uploaded_at = NOW(), updated_at = NOW()
                WHERE id = ?
            `, [resumeContent, filename, userId]);
            
            logger.info(`Resume updated for user ${userId}: ${filename}`);
            return await this.getUserById(userId);
        } catch (error) {
            logger.error('Resume update error:', error);
            throw error;
        }
    }

    /**
     * Change password
     */
    async changePassword(userId, currentPassword, newPassword) {
        try {
            // Get current password hash
            const [users] = await pool.execute(
                'SELECT password_hash FROM users WHERE id = ?',
                [userId]
            );

            if (users.length === 0) {
                throw new Error('User not found');
            }

            const isValidPassword = await this.comparePassword(currentPassword, users[0].password_hash);
            
            if (!isValidPassword) {
                throw new Error('Current password is incorrect');
            }

            // Validate new password
            if (!this.validatePassword(newPassword)) {
                throw new Error('New password must be at least 8 characters with uppercase, lowercase, number, and special character');
            }

            // Hash new password
            const newPasswordHash = await this.hashPassword(newPassword);

            // Update password
            await pool.execute(
                'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
                [newPasswordHash, userId]
            );

            logger.info(`Password changed for user ID: ${userId}`);
            return true;

        } catch (error) {
            logger.error('Password change error:', error);
            throw error;
        }
    }

    /**
     * Validate password strength
     */
    validatePassword(password) {
        // At least 8 characters, with uppercase, lowercase, number, and special character
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&\-#^+=])[A-Za-z\d@$!%*?&\-#^+=]{8,}$/;
        return passwordRegex.test(password);
    }

    /**
     * Validate email format
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Middleware to authenticate JWT token
     */
    authenticateToken(req, res, next) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }

        const decoded = this.verifyToken(token);
        if (!decoded) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }

        req.user = decoded;
        next();
    }

    /**
     * Middleware to check if user has active subscription
     */
    async requireSubscription(req, res, next) {
        try {
            // First authenticate the user
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];

            if (!token) {
                return res.status(401).json({ error: 'Access token required' });
            }

            const decoded = this.verifyToken(token);
            if (!decoded) {
                return res.status(403).json({ error: 'Invalid or expired token' });
            }

            req.user = decoded;

            // Check subscription status
            const [subscriptions] = await pool.execute(
                `SELECT s.*, p.questions_per_month 
                 FROM user_subscriptions s 
                 JOIN packages p ON s.package_id = p.id 
                 WHERE s.user_id = ? AND s.status = 'active' 
                 AND s.current_period_end > NOW()
                 LIMIT 1`,
                [req.user.id]
            );

            if (subscriptions.length === 0) {
                return res.status(403).json({ 
                    error: 'Active subscription required',
                    requiresPayment: true,
                    redirectUrl: '/pricing'
                });
            }

            req.subscription = subscriptions[0];
            next();
        } catch (error) {
            logger.error('Subscription check error:', error);
            return res.status(500).json({ error: 'Failed to verify subscription status' });
        }
    }

    /**
     * Get remaining questions for a user
     */
    async getRemainingQuestions(userId) {
        try {
            // Get active subscription
            const [subscriptions] = await pool.execute(
                `SELECT s.*, p.questions_per_month 
                 FROM user_subscriptions s 
                 JOIN packages p ON s.package_id = p.id 
                 WHERE s.user_id = ? AND s.status = 'active' 
                 AND s.current_period_end > NOW()
                 LIMIT 1`,
                [userId]
            );

            if (subscriptions.length === 0) {
                return { hasSubscription: false, remainingQuestions: 0 };
            }

            const subscription = subscriptions[0];

            // Get current question credit balance from question_usage table.
            // This sums across all active pools (the shared paid pool plus any
            // mode-specific trial credits), since a trial user can have more than
            // one active credit row now (separate practice/simulate allowances).
            const [creditResult] = await pool.execute(
                `SELECT question_count
                 FROM question_usage
                 WHERE user_id = ? AND practice_session_id IS NULL
                 AND (expiry_date IS NULL OR expiry_date > NOW())`,
                [userId]
            );

            if (!creditResult.length) {
                // No credit record found - user has no questions
                return {
                    hasSubscription: true,
                    remainingQuestions: 0,
                    usedQuestions: subscription.questions_per_month,
                    totalQuestions: subscription.questions_per_month,
                    periodEnd: subscription.current_period_end.toISOString()
                };
            }

            const remainingQuestions = creditResult.reduce((sum, c) => sum + c.question_count, 0);
            const usedQuestions = subscription.questions_per_month - remainingQuestions;

            return {
                hasSubscription: true,
                remainingQuestions: Math.max(0, remainingQuestions),
                usedQuestions: Math.max(0, usedQuestions),
                totalQuestions: subscription.questions_per_month,
                periodEnd: subscription.current_period_end.toISOString(),
                expiryDate: creditResult[0].expiry_date
            };
        } catch (error) {
            logger.error('Error getting remaining questions:', error);
            throw error;
        }
    }

    /**
     * Generate password reset token
     */
    async generatePasswordResetToken(email) {
        try {
            const resetToken = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

            const [result] = await pool.execute(`
                UPDATE users 
                SET reset_token = ?, reset_token_expires = ?
                WHERE email = ?
            `, [resetToken, expiresAt, email]);

            if (result.affectedRows === 0) {
                throw new Error('User not found');
            }

            return resetToken;
        } catch (error) {
            logger.error('Generate reset token error:', error);
            throw error;
        }
    }

    /**
     * Reset password with token
     */
    async resetPassword(token, newPassword) {
        try {
            // Find user with valid reset token
            const [users] = await pool.execute(`
                SELECT id, email FROM users 
                WHERE reset_token = ? AND reset_token_expires > NOW()
            `, [token]);

            if (users.length === 0) {
                throw new Error('Invalid or expired reset token');
            }

            const userId = users[0].id;
            const userEmail = users[0].email;

            // Validate new password
            if (!this.validatePassword(newPassword)) {
                throw new Error('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
            }

            // Hash new password
            const passwordHash = await this.hashPassword(newPassword);

            // Update password and clear reset token
            await pool.execute(`
                UPDATE users 
                SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL, updated_at = NOW()
                WHERE id = ?
            `, [passwordHash, userId]);

            logger.info(`Password reset for user ID: ${userId}`);
            return { success: true, email: userEmail };

        } catch (error) {
            logger.error('Password reset error:', error);
            throw error;
        }
    }

    /**
     * Verify Google OAuth token and authenticate/register user
     */
    async googleAuth(idToken, geoCountry = null) {
        try {
            // Verify the Google ID token
            const ticket = await googleClient.verifyIdToken({
                idToken: idToken,
                audience: GOOGLE_CLIENT_ID
            });
            
            const payload = ticket.getPayload();
            const { email, name, sub: googleId, email_verified, picture } = payload;

            if (!email_verified) {
                throw new Error('Email not verified by Google');
            }

            // Check if user exists
            const [existingUsers] = await pool.execute(
                'SELECT * FROM users WHERE email = ? OR google_id = ?',
                [email, googleId]
            );

            let user;
            
            if (existingUsers.length > 0) {
                user = existingUsers[0];
                
                // Update Google ID if not set
                if (!user.google_id) {
                    await pool.execute(
                        'UPDATE users SET google_id = ?, is_verified = TRUE, updated_at = NOW() WHERE id = ?',
                        [googleId, user.id]
                    );
                    user.google_id = googleId;
                }
                
                // Update last login
                await pool.execute(
                    'UPDATE users SET last_login = NOW() WHERE id = ?',
                    [user.id]
                );
                
                logger.info(`Google login successful for: ${email}`);
            } else {
                // Create new user with Google account.
                // Google doesn't provide country, so fall back to the geo-IP
                // derived value from the request (may be null).
                const [result] = await pool.execute(`
                    INSERT INTO users (
                        email,
                        name,
                        google_id,
                        is_verified,
                        auth_provider,
                        profile_picture,
                        country
                    ) VALUES (?, ?, ?, TRUE, 'google', ?, ?)
                `, [email, name, googleId, picture, geoCountry || null]);

                const userId = result.insertId;

                // Get the created user
                const [users] = await pool.execute(`
                    SELECT id, email, name, country, role, experience_years, is_verified, created_at, auth_provider 
                    FROM users WHERE id = ?
                `, [userId]);

                user = users[0];
                logger.info(`New Google user registered: ${email}`);
            }

            // Remove sensitive data
            delete user.password_hash;
            delete user.verification_token;
            delete user.reset_token;
            delete user.reset_token_expires;

            // Generate JWT token
            const token = this.generateToken(user);

            return {
                user,
                token,
                isNewUser: existingUsers.length === 0
            };

        } catch (error) {
            logger.error('Google authentication error:', error);
            throw error;
        }
    }
}

module.exports = new AuthService();