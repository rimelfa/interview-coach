const crypto = require('crypto');
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

class RedditCAPIService {
    constructor() {
        this.pixelId = 'a2_hny2jcjsxq16';
        this.apiUrl = `https://ads-api.reddit.com/api/v2.0/conversions/events/${this.pixelId}`;

        // Reddit access token from environment variable
        this.accessToken = process.env.REDDIT_ACCESS_TOKEN;
    }

    /**
     * Generate a unique event ID for deduplication
     * This should match the format used on the client side
     */
    generateEventId(eventType) {
        const timestamp = Date.now();
        const random = crypto.randomBytes(4).toString('hex');
        return `${eventType}_${timestamp}_${random}`;
    }

    /**
     * Hash email for privacy-compliant matching
     */
    hashEmail(email) {
        if (!email) return null;
        const normalizedEmail = email.toLowerCase().trim();
        return crypto.createHash('sha256').update(normalizedEmail).digest('hex');
    }

    /**
     * Send conversion event to Reddit CAPI
     */
    async sendConversionEvent(eventData) {
        try {
            // Check if we have necessary credentials
            if (!this.accessToken) {
                logger.warn('Reddit CAPI access token not configured');
                return { success: false, error: 'Missing access token' };
            }

            // Use same conversion ID format as client-side for deduplication
            const conversionId = eventData.eventId || eventData.conversionId || this.generateEventId(eventData.eventType);

            // Format event based on Reddit API documentation
            const event = {
                event_at: eventData.eventTime || new Date().toISOString(),
                event_type: eventData.eventType === 'Custom' ?
                    {
                        tracking_type: 'Custom',
                        custom_event_name: eventData.customEventName || eventData.eventType
                    } : {
                        tracking_type: eventData.eventType
                    }
            };

            // Add click_id if available (from URL parameters)
            if (eventData.clickId) {
                event.click_id = eventData.clickId;
            }

            // Add comprehensive user data for better matching
            const userData = {};

            // Required user identifiers
            if (eventData.ipAddress) userData.ip_address = eventData.ipAddress;
            if (eventData.userAgent) userData.user_agent = eventData.userAgent;

            // Hashed email for privacy
            if (eventData.email) userData.email = this.hashEmail(eventData.email);

            // Phone number (hashed if provided)
            if (eventData.phoneNumber) {
                const normalizedPhone = eventData.phoneNumber.replace(/\D/g, '');
                userData.phone_number = crypto.createHash('sha256').update(normalizedPhone).digest('hex');
            }

            // External ID for matching
            if (eventData.userId) userData.external_id = String(eventData.userId);

            // Screen dimensions if available
            if (eventData.screenWidth && eventData.screenHeight) {
                userData.screen_dimensions = {
                    width: eventData.screenWidth,
                    height: eventData.screenHeight
                };
            }

            // UUID for session tracking
            if (eventData.uuid) userData.uuid = eventData.uuid;

            // Only add user object if we have data
            if (Object.keys(userData).length > 0) {
                event.user = userData;
            }

            // Add comprehensive event metadata
            const eventMetadata = {
                conversion_id: conversionId,  // Required for deduplication
                currency: 'GBP',
                value_decimal: eventData.value || 0.00
            };

            // Add item count for purchases
            if (eventData.itemCount) {
                eventMetadata.item_count = eventData.itemCount;
            }

            // Add product details for purchase events
            if (eventData.products && Array.isArray(eventData.products)) {
                eventMetadata.products = eventData.products.map(product => ({
                    id: product.id || product.sku,
                    name: product.name || product.title,
                    category: product.category || product.group
                }));
            }

            event.event_metadata = eventMetadata;

            // Note: test_id field is not supported in current API
            // Events in test_mode will automatically appear in Test Events section

            const payload = {
                test_mode: process.env.NODE_ENV !== 'production',
                events: [event]
            };

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok) {
                logger.error('Reddit CAPI error:', result);
                return { success: false, error: result };
            }

            logger.info('Reddit CAPI event sent successfully:', {
                eventType: eventData.eventType,
                eventId: payload.events[0].event_id
            });

            return { success: true, eventId: payload.events[0].event_id };

        } catch (error) {
            logger.error('Reddit CAPI error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Track signup event
     */
    async trackSignUp(userData, requestInfo) {
        return await this.sendConversionEvent({
            eventType: 'SignUp',
            conversionId: this.generateEventId('signup'),
            email: userData.email,
            userId: userData.id,
            ipAddress: requestInfo.ip,
            userAgent: requestInfo.userAgent,
            value: 0.00
        });
    }

    /**
     * Track login event
     */
    async trackLogin(userData, requestInfo) {
        return await this.sendConversionEvent({
            eventType: 'Custom',
            customEventName: 'Login',
            conversionId: this.generateEventId('login'),
            email: userData.email,
            userId: userData.id,
            ipAddress: requestInfo.ip,
            userAgent: requestInfo.userAgent,
            value: 0.00
        });
    }

    /**
     * Track purchase event with product details
     */
    async trackPurchase(orderData, userData, requestInfo) {
        return await this.sendConversionEvent({
            eventType: 'Purchase',
            conversionId: orderData.transactionId || this.generateEventId('purchase'),
            email: userData.email,
            userId: userData.id,
            ipAddress: requestInfo.ip,
            userAgent: requestInfo.userAgent,
            value: orderData.amount,
            itemCount: orderData.itemCount || 1,
            products: orderData.products || [
                {
                    id: orderData.productId || 'pkg_default',
                    name: orderData.productName || 'Interview Questions Package',
                    category: 'Digital Product'
                }
            ]
        });
    }

    /**
     * Track test completion
     */
    async trackTestComplete(userData, requestInfo) {
        return await this.sendConversionEvent({
            eventType: 'Lead',
            conversionId: this.generateEventId('test_complete'),
            email: userData.email,
            userId: userData.id,
            ipAddress: requestInfo.ip,
            userAgent: requestInfo.userAgent,
            value: 0.00
        });
    }
}

// Export singleton instance
module.exports = new RedditCAPIService();