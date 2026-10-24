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

class KlaviyoService {
    constructor() {
        this.apiKey = process.env.KLAVIYO_API_KEY;
        this.baseUrl = 'https://a.klaviyo.com/api';
        this.revision = '2024-10-15'; // Latest Klaviyo API revision
        
        if (!this.apiKey) {
            logger.error('KLAVIYO_API_KEY environment variable is not set');
            throw new Error('Klaviyo API key is required');
        }
    }

    /**
     * Track a custom event/metric in Klaviyo
     * This will trigger flows based on the metric name
     */
    async trackEvent(eventName, email, properties = {}) {
        try {
            const endpoint = `${this.baseUrl}/events/`;
            
            const payload = {
                data: {
                    type: 'event',
                    attributes: {
                        properties: {
                            '$email': email,
                            ...properties
                        },
                        metric: {
                            data: {
                                type: 'metric',
                                attributes: {
                                    name: eventName
                                }
                            }
                        },
                        profile: {
                            data: {
                                type: 'profile',
                                attributes: {
                                    email: email
                                }
                            }
                        },
                        time: new Date().toISOString()
                    }
                }
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Klaviyo-API-Key ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'revision': this.revision
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Klaviyo API error: ${response.status} - ${errorData}`);
            }

            // Handle empty response (201 Created often returns no body)
            let data = null;
            const responseText = await response.text();
            if (responseText) {
                try {
                    data = JSON.parse(responseText);
                } catch (parseError) {
                    // Response is empty or not JSON - this is normal for some Klaviyo endpoints
                    logger.info(`Klaviyo event tracked: ${eventName} for ${email} (empty response)`);
                    return { success: true };
                }
            }
            
            logger.info(`Klaviyo event tracked: ${eventName} for ${email}`);
            return data || { success: true };

        } catch (error) {
            logger.error('Error tracking Klaviyo event:', error);
            // Don't throw error to prevent signup failure if Klaviyo is down
            return null;
        }
    }

    /**
     * Track email verification request
     * This will send the verification email
     */
    async trackEmailVerification(userData) {
        try {
            const { email, name, userId, verificationToken, siteUrl } = userData;
            
            // Split name into first and last
            const nameParts = name ? name.split(' ') : [''];
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            // Use passed site URL or generate fallback
            const finalSiteUrl = siteUrl || 'http://localhost:3001';

            // Build verification URL exactly like SQE-Easy
            const verificationUrl = `${finalSiteUrl}/verify-email?token=${verificationToken}`;
            
            console.log('🔥 Sending to Klaviyo:', {
                email,
                firstName,
                verificationUrl,
                verificationToken
            });

            // Event properties for verification email - simplified like SQE-Easy
            const eventProperties = {
                '$first_name': firstName,
                'signup_source': 'website',
                'verification_url': verificationUrl
            };

            // Track "IC - Email Verification" event - this will trigger verification email
            await this.trackEvent('IC - Email Verification', email, eventProperties);

            // Also create/update the profile with first and last name
            await this.createOrUpdateProfile(email, {
                first_name: firstName,
                last_name: lastName,
                properties: {
                    user_id: userId,
                    signup_source: 'website'
                }
            });

            logger.info(`Email verification triggered for: ${email} with URL: ${verificationUrl}`);
            return true;

        } catch (error) {
            logger.error('Error tracking email verification in Klaviyo:', error);
            return false;
        }
    }

    /**
     * Track user signup event
     * This will trigger the welcome email flow in Klaviyo
     */
    async trackSignup(userData) {
        try {
            const { email, name, userId, country, role, experienceYears, siteUrl } = userData;
            
            logger.info(`Klaviyo trackSignup received:`, { email, name, userId });
            
            // Split name into first and last
            const nameParts = name ? name.split(' ') : [''];
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            
            logger.info(`Name split into:`, { firstName, lastName });

            // Use passed site URL or generate fallback
            const finalSiteUrl = siteUrl || 'http://localhost:3001';

            // Profile attributes (only valid Klaviyo fields)
            const profileAttributes = {
                first_name: firstName,
                last_name: lastName,
                // Custom properties must be in properties object, not attributes
                properties: {
                    user_id: userId,
                    signup_date: new Date().toISOString(),
                    signup_source: 'Good Chat App',
                    account_type: 'free',
                    platform: 'web',
                    country: country,
                    role: role,
                    experience_years: experienceYears,
                    site_url: finalSiteUrl
                }
            };

            // Event properties (can include any custom fields)
            const eventProperties = {
                '$first_name': firstName,
                '$last_name': lastName,
                user_id: userId,
                signup_date: new Date().toISOString(),
                signup_source: 'Good Chat',
                country: country,
                role: role,
                experience_years: experienceYears,
                site_url: finalSiteUrl
            };

            // Track "IC - Signup" event - this will trigger your welcome flow
            await this.trackEvent('IC - Signup', email, eventProperties);

            // Also create/update the profile with proper attributes
            await this.createOrUpdateProfile(email, profileAttributes);

            logger.info(`Welcome email triggered for new user: ${email}`);
            return true;

        } catch (error) {
            logger.error('Error tracking signup in Klaviyo:', error);
            // Don't throw error to prevent signup failure
            return false;
        }
    }

    /**
     * Create or update a Klaviyo profile
     */
    async createOrUpdateProfile(email, profileData = {}) {
        try {
            const endpoint = `${this.baseUrl}/profiles/`;
            
            // Separate standard attributes from custom properties
            const { first_name, last_name, properties = {} } = profileData;
            
            const payload = {
                data: {
                    type: 'profile',
                    attributes: {
                        email: email,
                        first_name: first_name,
                        last_name: last_name,
                        properties: properties // Custom fields go in properties
                    }
                }
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Klaviyo-API-Key ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'revision': this.revision
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.text();

                // Handle duplicate profile (409) - need to update existing profile
                if (response.status === 409) {
                    logger.info(`Klaviyo profile already exists for: ${email} - updating with PATCH`);

                    // Find profile ID and update it
                    const searchUrl = `${this.baseUrl}/profiles/?filter=equals(email,"${email}")`;
                    const searchResponse = await fetch(searchUrl, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Klaviyo-API-Key ${this.apiKey}`,
                            'Accept': 'application/json',
                            'revision': this.revision
                        }
                    });

                    const searchData = await searchResponse.json();
                    if (searchData.data && searchData.data.length > 0) {
                        const profileId = searchData.data[0].id;

                        // Update with PATCH
                        const updateUrl = `${this.baseUrl}/profiles/${profileId}/`;
                        const updatePayload = {
                            data: {
                                type: 'profile',
                                id: profileId,
                                attributes: {
                                    first_name: first_name,
                                    last_name: last_name,
                                    properties: properties
                                }
                            }
                        };

                        const updateResponse = await fetch(updateUrl, {
                            method: 'PATCH',
                            headers: {
                                'Authorization': `Klaviyo-API-Key ${this.apiKey}`,
                                'Content-Type': 'application/json',
                                'revision': this.revision
                            },
                            body: JSON.stringify(updatePayload)
                        });

                        if (updateResponse.ok) {
                            logger.info(`Klaviyo profile updated for: ${email}`);
                            return { success: true, message: 'Profile updated' };
                        } else {
                            logger.error(`Failed to update Klaviyo profile for: ${email}`);
                        }
                    }

                    return { success: true, message: 'Profile exists' };
                }

                throw new Error(`Klaviyo profile API error: ${response.status} - ${errorData}`);
            }

            // Handle empty response
            let data = null;
            const responseText = await response.text();
            if (responseText) {
                try {
                    data = JSON.parse(responseText);
                } catch (parseError) {
                    logger.info(`Klaviyo profile created/updated for: ${email} (empty response)`);
                    return { success: true };
                }
            }
            
            logger.info(`Klaviyo profile created/updated for: ${email}`);
            return data || { success: true };

        } catch (error) {
            logger.error('Error creating/updating Klaviyo profile:', error);
            return null;
        }
    }

    /**
     * Track purchase event for email marketing
     */
    async trackPurchase(userData, packageData) {
        try {
            const { email, name, userId } = userData;
            const { packageName, price, currency, questions } = packageData;

            // Split name into first and last for personalization
            const nameParts = name ? name.split(' ') : [''];
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            const properties = {
                '$first_name': firstName,
                '$last_name': lastName,
                user_id: userId,
                package_name: packageName,
                price: price,
                currency: currency,
                questions_purchased: questions,
                purchase_date: new Date().toISOString()
            };

            // Track "IC - Package Purchased" event (must match Klaviyo flow trigger)
            await this.trackEvent('IC - Package Purchased', email, properties);

            // Update profile to mark as paying customer
            await this.createOrUpdateProfile(email, {
                account_type: 'paid',
                last_purchase_date: new Date().toISOString(),
                total_questions_purchased: questions
            });

            logger.info(`Purchase tracked in Klaviyo for: ${email}`);
            return true;

        } catch (error) {
            logger.error('Error tracking purchase in Klaviyo:', error);
            return false;
        }
    }

    /**
     * Track practice session completion
     */
    async trackPracticeSession(userData, sessionData) {
        try {
            const { email } = userData;
            const { questionsCompleted, averageScore, duration } = sessionData;

            const properties = {
                questions_completed: questionsCompleted,
                average_score: averageScore,
                session_duration_minutes: duration,
                session_date: new Date().toISOString()
            };

            // Track "Practice Session Completed" event
            await this.trackEvent('Practice Session Completed', email, properties);

            logger.info(`Practice session tracked in Klaviyo for: ${email}`);
            return true;

        } catch (error) {
            logger.error('Error tracking practice session in Klaviyo:', error);
            return false;
        }
    }
}

module.exports = new KlaviyoService();