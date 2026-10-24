// Check if already loaded to prevent redeclaration
if (window.PaymentSuccessPage) {
    console.log('PaymentSuccessPage already exists, skipping redeclaration');
} else {
    console.log('Declaring PaymentSuccessPage class');

    window.PaymentSuccessPage = class PaymentSuccessPage {
        constructor() {
            console.log('PaymentSuccessPage constructor called');
        }

        async init(container) {
            console.log('PaymentSuccessPage init called');
            
            try {
                // Check authentication first
                if (typeof authManager !== 'undefined' && !authManager.isAuthenticated()) {
                    console.log('User not authenticated, redirecting to login');
                    window.location.href = '/login';
                    return;
                }

                // Inject styles
                this.injectStyles();
                
                // Set page content
                let contentArea = document.querySelector('.page-content');
                if (!contentArea) {
                    contentArea = document.createElement('div');
                    contentArea.className = 'page-content';
                    const containerEl = document.querySelector('.container');
                    if (containerEl) {
                        containerEl.appendChild(contentArea);
                    }
                }
                
                if (contentArea) {
                    contentArea.innerHTML = this.getHTML();
                }

                // Process the payment immediately
                await this.processPaymentSuccess();
                
                console.log('PaymentSuccessPage initialized successfully');
            } catch (error) {
                console.error('Error initializing payment success page:', error);
                this.showError('Failed to load payment success page');
            }
        }

        async processPaymentSuccess() {
            try {
                console.log('Processing payment success...');
                
                const urlParams = new URLSearchParams(window.location.search);
                console.log('All URL parameters:', Object.fromEntries(urlParams.entries()));
                
                // Check for different types of Stripe redirects
                const sessionId = urlParams.get('session_id');
                const paymentIntent = urlParams.get('payment_intent');
                const paymentIntentClientSecret = urlParams.get('payment_intent_client_secret');
                const redirectStatus = urlParams.get('redirect_status');
                
                console.log('Stripe redirect parameters:', {
                    sessionId,
                    paymentIntent,
                    paymentIntentClientSecret,
                    redirectStatus
                });
                
                // Handle Payment Intent success (embedded checkout)
                if (paymentIntent && redirectStatus === 'succeeded') {
                    console.log('Processing Payment Intent success:', paymentIntent);
                    await this.handlePaymentIntentSuccess(paymentIntent);
                    return;
                }
                
                // Handle Checkout Session success (hosted checkout)
                if (sessionId) {
                    console.log('Processing Checkout Session success:', sessionId);
                    await this.handleCheckoutSessionSuccess(sessionId);
                    return;
                }
                
                // No valid payment identifiers found
                this.showError('No valid payment information found in URL');
                return;
                
            } catch (error) {
                console.error('Error processing payment:', error);
                this.showError('An error occurred while processing your payment');
            }
        }

        async handlePaymentIntentSuccess(paymentIntentId) {
            try {
                // Show processing state
                this.showProcessing();
                
                const token = localStorage.getItem('authToken');
                if (!token) {
                    this.showError('Authentication required. Please log in again.');
                    return;
                }
                
                console.log('Calling Payment Intent success API...');
                
                // Call our payment intent success endpoint
                const response = await fetch(`/api/confirm-payment`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        paymentIntentId: paymentIntentId
                    })
                });
                
                console.log('Payment Intent API Response status:', response.status);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Payment Intent API Error:', errorText);
                    this.showError(`Payment processing failed: ${errorText}`);
                    return;
                }
                
                const result = await response.json();
                console.log('Payment Intent success response:', result);
                
                if (result.success) {
                    // Pass the subscription data which contains questionsRemaining
                    this.showSuccess(result.subscription);
                } else {
                    this.showError(result.error || 'Payment processing failed');
                }
                
            } catch (error) {
                console.error('Error handling Payment Intent success:', error);
                this.showError('An error occurred while processing your payment');
            }
        }

        async handleCheckoutSessionSuccess(sessionId) {
            try {
                // Show processing state
                this.showProcessing();
                
                const token = localStorage.getItem('authToken');
                if (!token) {
                    this.showError('Authentication required. Please log in again.');
                    return;
                }
                
                console.log('Calling checkout session success API...');
                
                // Call our checkout session success endpoint
                const response = await fetch(`/api/payment/success?session_id=${sessionId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                console.log('Checkout Session API Response status:', response.status);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Checkout Session API Error:', errorText);
                    this.showError(`Payment processing failed: ${errorText}`);
                    return;
                }
                
                const result = await response.json();
                console.log('Checkout Session success response:', result);
                
                if (result.success) {
                    this.showSuccess(result.subscription);
                } else {
                    this.showError(result.error || 'Payment processing failed');
                }
                
            } catch (error) {
                console.error('Error handling Checkout Session success:', error);
                this.showError('An error occurred while processing your payment');
            }
        }

        showProcessing() {
            const statusDiv = document.getElementById('paymentStatus');
            if (statusDiv) {
                statusDiv.innerHTML = `
                    <div class="processing-state">
                        <div class="spinner"></div>
                        <h2>Processing Your Payment...</h2>
                        <p>Please wait while we activate your subscription.</p>
                    </div>
                `;
            }
        }

        showSuccess(subscription) {
            const statusDiv = document.getElementById('paymentStatus');
            if (statusDiv) {
                statusDiv.innerHTML = `
                    <div class="success-state">
                        <div class="success-icon">✅</div>
                        <h2>Payment Successful!</h2>
                        <p>Your package has been activated successfully.</p>
                        <div class="subscription-details">
                            <h3>Subscription Details:</h3>
                            <p><strong>Total Questions:</strong> ${subscription.questionsRemaining || 'N/A'}</p>
                        </div>
                        <div class="action-buttons">
                            <button class="btn btn-primary" onclick="window.location.href='/practice'">
                                Start Practicing
                            </button>
                        </div>
                    </div>
                `;
            }
            
            // Fire Google Ads conversion tracking
            if (typeof gtag !== 'undefined') {
                // Determine conversion value based on subscription
                let conversionValue = 6.99; // Default to lower tier
                if (subscription && subscription.questionsRemaining) {
                    // If 100+ questions, it's the higher tier package (£16.99)
                    conversionValue = subscription.questionsRemaining >= 100 ? 10.99 : 6.99;
                }

                gtag('event', 'conversion', {
                    'send_to': 'AW-958968799/RF1fCKeK950cEN_noskD',
                    'value': conversionValue,
                    'currency': 'GBP'
                });
            }
        }

        showError(message) {
            const statusDiv = document.getElementById('paymentStatus');
            if (statusDiv) {
                statusDiv.innerHTML = `
                    <div class="error-state">
                        <div class="error-icon">❌</div>
                        <h2>Payment Processing Issue</h2>
                        <p>${message}</p>
                        <div class="action-buttons">
                            <button class="btn btn-primary" onclick="window.location.href='/pricing'">
                                Try Again
                            </button>
                        </div>
                    </div>
                `;
            }
        }

        getHTML() {
            return `
                <div class="payment-success-container">
                    <div id="paymentStatus" class="payment-status">
                        <div class="processing-state">
                            <div class="spinner"></div>
                            <h2>Processing Your Payment...</h2>
                            <p>Please wait while we activate your subscription.</p>
                        </div>
                    </div>
                </div>
            `;
        }

        injectStyles() {
            const existingStyle = document.getElementById('payment-success-styles');
            if (existingStyle) {
                existingStyle.remove();
            }
            
            const styleElement = document.createElement('style');
            styleElement.id = 'payment-success-styles';
            styleElement.textContent = this.getStyles();
            document.head.appendChild(styleElement);
        }

        getStyles() {
            return `
            body {
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                min-height: 100vh;
            }

            .payment-success-container {
                max-width: 800px;
                margin: 40px auto;
                padding: 0 20px;
            }

            .payment-status {
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                padding: 60px 40px;
                border-radius: 16px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                text-align: center;
                min-height: 300px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .processing-state, .success-state, .error-state {
                width: 100%;
            }

            .spinner {
                border: 4px solid #f3f3f3;
                border-top: 4px solid #667eea;
                border-radius: 50%;
                width: 60px;
                height: 60px;
                animation: spin 1s linear infinite;
                margin: 0 auto 30px;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .success-icon, .error-icon {
                font-size: 4em;
                margin-bottom: 20px;
            }

            .success-state h2 {
                color: #48bb78;
                font-size: 2.2em;
                margin-bottom: 20px;
                font-weight: 600;
            }

            .error-state h2 {
                color: #f56565;
                font-size: 2.2em;
                margin-bottom: 20px;
                font-weight: 600;
            }

            .processing-state h2 {
                color: #4a5568;
                font-size: 2.2em;
                margin-bottom: 20px;
                font-weight: 600;
            }

            .payment-status p {
                font-size: 1.2em;
                color: #4a5568;
                margin-bottom: 30px;
                line-height: 1.6;
            }

            .subscription-details {
                background: #f7fafc;
                border-radius: 12px;
                padding: 25px;
                margin: 30px 0;
                text-align: center;
            }

            .subscription-details h3 {
                color: #2d3748;
                margin-bottom: 15px;
                font-size: 1.3em;
            }

            .subscription-details p {
                margin: 10px 0;
                font-size: 1em;
                color: #4a5568;
            }

            .action-buttons {
                display: flex;
                gap: 15px;
                justify-content: center;
                flex-wrap: wrap;
                margin-top: 30px;
            }

            .btn {
                padding: 15px 30px;
                border: none;
                border-radius: 12px;
                font-size: 1.1em;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                text-decoration: none;
                display: inline-block;
            }

            .btn-primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }

            .btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
            }

            .btn-secondary {
                background: #e2e8f0;
                color: #4a5568;
            }

            .btn-secondary:hover {
                background: #cbd5e0;
                transform: translateY(-2px);
            }

            @media (max-width: 768px) {
                .payment-success-container {
                    padding: 0 15px;
                }

                .payment-status {
                    padding: 40px 20px;
                }

                .action-buttons {
                    flex-direction: column;
                }

                .btn {
                    width: 100%;
                    text-align: center;
                }
            }
            `;
        }

        destroy() {
            // Remove page-specific styles
            const styles = document.getElementById('payment-success-styles');
            if (styles) {
                styles.remove();
            }
        }
    };

    console.log('PaymentSuccessPage class declared successfully');
}