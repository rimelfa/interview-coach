// Reddit Pixel Tracking Service
// Handles conversion events and user data updates

class RedditTracking {
    constructor() {
        this.pixelId = 'a2_hny2jcjsxq16';
        this.isInitialized = false;
    }

    // Initialize or update Reddit Pixel with user data
    initWithUser(userData) {
        if (!window.rdt) {
            console.warn('Reddit Pixel not loaded yet');
            return;
        }

        if (userData && userData.email) {
            // Get click ID from URL if available
            const urlParams = new URLSearchParams(window.location.search);
            const clickId = urlParams.get('rdt_cid');

            const initData = {
                email: userData.email,
                externalId: userData.id ? userData.id.toString() : '',
                phoneNumber: userData.phone || ''
            };

            // Add click ID if available
            if (clickId) {
                initData.clickId = clickId;
            }

            window.rdt('init', this.pixelId, initData);
            this.isInitialized = true;
        }
    }

    // Track standard events
    trackPageVisit() {
        if (window.rdt) {
            // Generate unique conversion ID for page visits if needed
            const conversionId = this.generateEventId('pagevisit');

            window.rdt('track', 'PageVisit', {
                conversionId: conversionId
            });

            // Store event ID for deduplication
            this.storeEventId(conversionId);
        }
    }

    // Track signup completion
    trackSignUp(userData) {
        if (!window.rdt) return;

        // Update pixel with user data
        if (userData) {
            this.initWithUser(userData);
        }

        // Generate unique conversion ID for deduplication
        const conversionId = this.generateEventId('signup');

        window.rdt('track', 'SignUp', {
            conversionId: conversionId,
            currency: 'GBP',
            value: 0.00,
            transactionId: `signup_${userData?.id || Date.now()}`,
            email: userData?.email || ''
        });

        // Store event ID for deduplication
        this.storeEventId(conversionId);
    }

    // Track successful login
    trackLogin(userData) {
        if (!window.rdt) return;

        // Update pixel with user data
        if (userData) {
            this.initWithUser(userData);
        }

        // Generate unique conversion ID for deduplication
        const conversionId = this.generateEventId('login');

        window.rdt('track', 'Custom', {
            conversionId: conversionId,
            customEventName: 'Login',
            currency: 'GBP',
            value: 0.00,
            email: userData?.email || ''
        });

        // Store event ID for deduplication
        this.storeEventId(conversionId);
    }

    // Track purchase/subscription
    trackPurchase(orderData) {
        if (!window.rdt) return;

        // Use transaction ID as conversion ID for purchases
        const conversionId = orderData.transactionId || this.generateEventId('purchase');

        window.rdt('track', 'Purchase', {
            conversionId: conversionId,
            currency: 'GBP',
            value: orderData.amount || 0.00,
            transactionId: conversionId,
            itemCount: orderData.itemCount || 1,
            products: orderData.products || []
        });

        // Store event ID for deduplication
        this.storeEventId(conversionId);
    }

    // Track when user starts practice/test
    trackPracticeStart(sessionType = 'practice') {
        if (!window.rdt) return;

        // Generate unique conversion ID for deduplication
        const conversionId = this.generateEventId(`${sessionType}_start`);

        window.rdt('track', 'ViewContent', {
            conversionId: conversionId,
            contentType: sessionType,
            contentName: `${sessionType}_session_started`,
            currency: 'GBP',
            value: 0.00
        });

        // Store event ID for deduplication
        this.storeEventId(conversionId);
    }

    // Track when user completes a test
    trackTestComplete() {
        if (!window.rdt) return;

        // Generate unique conversion ID for deduplication
        const conversionId = this.generateEventId('test_complete');

        window.rdt('track', 'Lead', {
            conversionId: conversionId,
            currency: 'GBP',
            value: 0.00,
            leadType: 'test_completed'
        });

        // Store event ID for deduplication
        this.storeEventId(conversionId);
    }

    // Track add to cart (for pricing page)
    trackAddToCart(packageData) {
        if (!window.rdt) return;

        // Generate unique conversion ID for deduplication
        const conversionId = this.generateEventId(`cart_${packageData.id}`);

        window.rdt('track', 'AddToCart', {
            conversionId: conversionId,
            currency: 'GBP',
            value: packageData.price || 0.00,
            itemCount: 1,
            products: [{
                id: packageData.id,
                name: packageData.name,
                price: packageData.price
            }]
        });

        // Store event ID for deduplication
        this.storeEventId(conversionId);
    }

    // Generate unique event ID for deduplication
    generateEventId(eventType) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        return `${eventType}_${timestamp}_${random}`;
    }

    // Store event ID to prevent duplicates
    storeEventId(eventId) {
        const storedEvents = JSON.parse(localStorage.getItem('reddit_events') || '[]');
        storedEvents.push({
            id: eventId,
            timestamp: Date.now()
        });

        // Keep only last 100 events or events from last 7 days
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const recentEvents = storedEvents.filter(e => e.timestamp > sevenDaysAgo).slice(-100);

        localStorage.setItem('reddit_events', JSON.stringify(recentEvents));
    }

    // Check if event was already sent
    isDuplicateEvent(eventId) {
        const storedEvents = JSON.parse(localStorage.getItem('reddit_events') || '[]');
        return storedEvents.some(e => e.id === eventId);
    }
}

// Create singleton instance
const redditTracking = new RedditTracking();

// Export for use in other modules
window.redditTracking = redditTracking;