// Always define StripeCheckout class
console.log('Loading StripeCheckout class...');

// Force clean definition
delete window.StripeCheckout;

window.StripeCheckout = class StripeCheckout {
    constructor() {
        this.stripe = null;
        this.elements = null;
        this.paymentElement = null;
        this.addressElement = null;
        this.container = null;
        this.isInitialized = false;
        this.isRendering = false;
        this.clientSecret = null;
        this.packageInfo = null;
        
        // Don't auto-initialize, wait for manual call
    }

    async init() {
        // Prevent double-initialization (caused by double-render in SPA)
        if (this.isInitialized || this._initStarted) {
            console.log('StripeCheckout: Already initialized or initializing, skipping duplicate call');
            return;
        }
        this._initStarted = true;

        try {
            console.log('StripeCheckout: Starting initialization...');
            
            // Check if Stripe is available
            if (typeof Stripe === 'undefined') {
                throw new Error('Stripe.js is not loaded');
            }
            
            // Get package info from URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const packageId = urlParams.get('package');
            
            if (!packageId) {
                throw new Error('Package ID not found in URL');
            }
            
            console.log('StripeCheckout: Creating checkout session for package:', packageId);
            
            // Get Stripe configuration from server
            const configResponse = await fetch('/api/stripe/config');
            const config = await configResponse.json();
            
            if (!config.publishableKey) {
                throw new Error('Stripe publishable key not found');
            }
            
            // Initialize Stripe
            this.stripe = Stripe(config.publishableKey);
            console.log('StripeCheckout: Stripe initialized');
            
            // Create payment intent for embedded checkout
            const paymentResponse = await fetch('/api/create-payment-intent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authManager.getToken()}`
                },
                body: JSON.stringify({
                    packageId: parseInt(packageId),
                    currency: this.detectUserCurrency()
                })
            });
            
            if (!paymentResponse.ok) {
                const errorData = await paymentResponse.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `Server error: ${paymentResponse.status}`);
            }
            
            const paymentData = await paymentResponse.json();
            
            if (!paymentData.success) {
                throw new Error(paymentData.error || 'Failed to create payment intent');
            }
            
            this.clientSecret = paymentData.clientSecret;
            this.packageInfo = {
                id: packageId,
                name: paymentData.packageInfo?.name || 'Good Chat Package',
                formattedPrice: `${this.formatCurrency(paymentData.amount / 100, paymentData.currency)}`,
                questionsPerMonth: paymentData.packageInfo?.questionsPerMonth || 50,
                currency: paymentData.currency,
                amountInCents: paymentData.amount
            };
            
            console.log('StripeCheckout: Payment intent created');
            
            // Initialize Stripe Elements with payment intent client secret
            this.elements = this.stripe.elements({
                clientSecret: this.clientSecret,
                appearance: {
                    theme: 'stripe',
                    variables: {
                        colorPrimary: '#667eea',
                        colorBackground: '#ffffff',
                        colorText: '#30313d',
                        borderRadius: '8px'
                    }
                },
                loader: 'auto'
            });
            
            console.log('StripeCheckout: Elements initialized');
            
            // Render the checkout form
            await this.render();
            
            // Auto-scroll to the payment section
            this.scrollToPaymentSection();
            
            this.isInitialized = true;
            console.log('StripeCheckout: Initialization complete');
            
        } catch (error) {
            console.error('StripeCheckout: Initialization failed:', error);
            this.isRendering = false; // Allow retry on error
            this.showError('Failed to initialize checkout: ' + error.message);
        }
    }

    async render() {
        console.log('StripeCheckout: Starting render...');
        
        // Prevent multiple renders
        if (this.isRendering) {
            console.log('StripeCheckout: Already rendering, skipping...');
            return;
        }
        this.isRendering = true;
        
        // Find or create container
        this.container = document.getElementById('stripe-checkout-container') || document.body;
        
        // Clear existing content
        this.container.innerHTML = '';
        
        // Get user email from localStorage
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const userEmail = user.email || '';
        
        // Create checkout form HTML based on Stripe sample
        const checkoutHTML = `
            <div class="stripe-checkout-wrapper">
                <div class="checkout-header">
                    <h2>Complete Your Purchase</h2>
                    <p class="package-info">${this.packageInfo?.name || 'Package'} - ${this.packageInfo?.formattedPrice || ''}</p>
                </div>
                
                <form id="stripe-checkout-form" class="stripe-checkout-form">
                    <div class="form-section">
                        <label for="email-input">Email</label>
                        <input type="email" id="email-input" value="${userEmail}" required class="email-input" placeholder="your@email.com" />
                        <div id="email-errors" class="error-message"></div>
                    </div>
                    
                    <div class="form-section">
                        <h4>Card Details</h4>
                        <div id="payment-element" class="payment-element">
                            <div class="card-loading" style="text-align: center; padding: 20px; color: #666;">
                                <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #ddd; border-top: 2px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                                <p style="margin: 10px 0 0 0; font-size: 14px;">Loading payment form...</p>
                            </div>
                        </div>
                    </div>
                    
                    <button type="submit" id="stripe-submit" class="stripe-submit-button">
                        <span class="button-text">Pay ${this.packageInfo?.formattedPrice || 'Now'}</span>
                        <div class="spinner hidden"></div>
                    </button>
                    
                    <div id="payment-messages" class="payment-messages"></div>
                </form>
            </div>
        `;
        
        this.container.innerHTML = checkoutHTML;
        
        // Add styles
        this.injectStyles();
        
        // Use Payment Element with simplified configuration
        this.paymentElement = this.elements.create('payment', {
            fields: {
                billingDetails: {
                    address: {
                        country: 'never',
                        line1: 'never',
                        line2: 'never',
                        city: 'never',
                        state: 'never',
                        postalCode: 'never'
                    },
                    email: 'never', // We collect email separately
                    phone: 'never' // Don't collect phone for Link
                }
            },
            wallets: {
                applePay: 'never', // Disabled since domain not verified
                googlePay: 'auto'  
            },
            business: {
                name: 'Good Chat'
            },
            layout: {
                type: 'tabs',
                defaultCollapsed: false
                // Removed radios and spacedAccordionItems - incompatible with 'tabs' layout
            }
        });
        
        // Clear loading state and mount payment element
        const paymentContainer = document.getElementById('payment-element');
        if (paymentContainer) {
            paymentContainer.innerHTML = '';
        }
        this.paymentElement.mount('#payment-element');
        
        // Apple Pay requires valid SSL certificates, which we don't have in development
        // For now, just use card payments
        
        console.log('StripeCheckout: Elements mounted');
        
        // Completely remove the Optional Link section from DOM
        const removeOptionalSection = () => {
            // Find and remove any Optional fieldsets that contain Link content
            document.querySelectorAll('fieldset').forEach(fieldset => {
                const legend = fieldset.querySelector('legend');
                if (legend && legend.textContent && legend.textContent.trim() === 'Optional') {
                    // Check if it contains Link-related inputs
                    const hasLinkInputs = fieldset.querySelector('input[type="tel"]') || 
                                        fieldset.querySelector('input[placeholder*="name"]') ||
                                        fieldset.textContent.includes('Save my information');
                    
                    if (hasLinkInputs) {
                        console.log('Removing Optional Link section from DOM');
                        fieldset.remove(); // Completely remove from DOM
                    }
                }
            });
            
            // Also remove any standalone Link sections
            document.querySelectorAll('div, section').forEach(element => {
                if (element.textContent && element.textContent.includes('Save my information for faster checkout')) {
                    console.log('Removing Link section from DOM');
                    element.remove();
                }
            });
            
            // Remove any elements with Link-related classes
            document.querySelectorAll('.p-Fieldset--optional, [data-testid*="optional"]').forEach(element => {
                if (element.textContent && element.textContent.includes('Save my information')) {
                    console.log('Removing optional element with Link content');
                    element.remove();
                }
            });
        };
        
        // Run removal immediately and multiple times
        removeOptionalSection();
        setTimeout(removeOptionalSection, 100);
        setTimeout(removeOptionalSection, 300);
        setTimeout(removeOptionalSection, 500);
        setTimeout(removeOptionalSection, 1000);
        
        // Set up continuous monitoring with MutationObserver
        const observer = new MutationObserver(() => {
            removeOptionalSection();
        });
        
        // Observe the payment element for any DOM changes
        const observeContainer = document.getElementById('payment-element');
        if (observeContainer) {
            observer.observe(observeContainer, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'class', 'open', 'aria-expanded']
            });
        }
        
        // Also run when the payment element changes (user interaction)
        if (this.paymentElement) {
            this.paymentElement.on('change', () => {
                setTimeout(removeOptionalSection, 10);
                setTimeout(removeOptionalSection, 50);
            });
        }
        
        // Run on any input events in the payment form
        document.addEventListener('input', (e) => {
            if (e.target.closest('#payment-element')) {
                setTimeout(removeOptionalSection, 10);
            }
        });
        
        // Set up form submission
        const form = document.getElementById('stripe-checkout-form');
        form.addEventListener('submit', this.handleSubmit.bind(this));
        
        // Set up email validation
        const emailInput = document.getElementById('email-input');
        emailInput.addEventListener('blur', this.validateEmail.bind(this));
        emailInput.addEventListener('input', this.clearEmailError.bind(this));
        
        console.log('StripeCheckout: Render complete');
        this.isRendering = false;
    }


    async validateEmail() {
        const emailInput = document.getElementById('email-input');
        const errorDiv = document.getElementById('email-errors');
        const email = emailInput.value.trim();
        
        if (!email) {
            return true; // Allow empty email for now
        }
        
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errorDiv.textContent = 'Please enter a valid email address';
            emailInput.classList.add('error');
            return false;
        }
        
        this.clearEmailError();
        return true;
    }
    
    clearEmailError() {
        const emailInput = document.getElementById('email-input');
        const errorDiv = document.getElementById('email-errors');
        
        errorDiv.textContent = '';
        emailInput.classList.remove('error');
    }
    
    async handleSubmit(event) {
        event.preventDefault();
        
        console.log('StripeCheckout: Form submitted');
        
        const submitButton = document.getElementById('stripe-submit');
        const buttonText = submitButton.querySelector('.button-text');
        const spinner = submitButton.querySelector('.spinner');
        const messages = document.getElementById('payment-messages');
        
        // Validate email first
        if (!await this.validateEmail()) {
            return;
        }
        
        // Show loading state
        submitButton.disabled = true;
        buttonText.style.display = 'none';
        spinner.classList.remove('hidden');
        messages.textContent = '';
        
        try {
            const email = document.getElementById('email-input').value.trim();
            
            // Confirm the payment using Payment Element
            const { error, paymentIntent } = await this.stripe.confirmPayment({
                elements: this.elements,
                confirmParams: {
                    return_url: `${window.location.origin}/payment-success?payment_intent_client_secret=${this.clientSecret}&redirect_status=succeeded`,
                    receipt_email: email,
                    payment_method_data: {
                        billing_details: {
                            email: email,
                            phone: '', // Required since we set phone: 'never'
                            address: {
                                country: 'GB',
                                line1: '',
                                line2: '',
                                city: '',
                                state: '',
                                postal_code: ''
                            }
                        }
                    }
                },
                redirect: 'if_required' // Only redirect if 3D Secure is needed
            });
            
            if (error) {
                console.error('StripeCheckout: Payment failed:', error);
                this.showError(error.message);
                this.resetButton();
                return;
            }
            
            // Payment succeeded, redirect to success page with proper parameters
            if (paymentIntent && paymentIntent.status === 'succeeded') {
                // Match the expected URL parameters that payment-success.js is looking for
                window.location.href = `/payment-success?payment_intent=${paymentIntent.id}&redirect_status=succeeded`;
            }
            
        } catch (error) {
            console.error('StripeCheckout: Payment processing error:', error);
            this.showError('Payment failed: ' + error.message);
            this.resetButton();
        }
    }
    
    resetButton() {
        const submitButton = document.getElementById('stripe-submit');
        const buttonText = submitButton.querySelector('.button-text');
        const spinner = submitButton.querySelector('.spinner');
        
        submitButton.disabled = false;
        buttonText.style.display = 'inline';
        spinner.classList.add('hidden');
    }

    showError(message) {
        const messages = document.getElementById('payment-messages');
        if (messages) {
            messages.textContent = message;
            messages.className = 'payment-messages error';
        } else {
            // If no messages container, show in the main container
            const container = document.getElementById('stripe-checkout-container');
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 50px; color: #dc2626;">
                        <h3>Error Loading Checkout</h3>
                        <p>${message}</p>
                        <button onclick="window.location.href='/pricing'" style="background: #667eea; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; margin-top: 20px;">
                            Back to Pricing
                        </button>
                    </div>
                `;
            } else {
                console.error('Error messages container not found:', message);
                alert(message); // Fallback to alert
            }
        }
    }
    
    formatCurrency(amount, currency) {
        const currencySymbols = {
            'GBP': '£',
            'USD': '$',
            'EUR': '€',
            'CAD': 'C$',
            'AUD': 'A$'
        };
        
        const symbol = currencySymbols[currency.toUpperCase()] || currency.toUpperCase();
        return `${symbol}${amount.toFixed(2)}`;
    }
    
    detectUserCurrency() {
        try {
            // Get user's locale from browser
            const locale = navigator.language || navigator.languages[0] || 'en-US';
            console.log('Browser locale detected:', locale);
            
            // Map locales to currencies (simplified version)
            if (locale.toLowerCase().includes('en-gb') || locale.toLowerCase().includes('en-uk')) {
                return 'GBP';
            }
            
            const currencyMap = {
                'en-GB': 'GBP',
                'en-UK': 'GBP',
                'de': 'EUR', 'de-DE': 'EUR',
                'fr': 'EUR', 'fr-FR': 'EUR',
                'es': 'EUR', 'es-ES': 'EUR',
                'it': 'EUR', 'it-IT': 'EUR',
                'en-CA': 'CAD',
                'fr-CA': 'CAD',
                'en-AU': 'AUD'
            };
            
            return currencyMap[locale] || currencyMap[locale.split('-')[0]] || 'USD';
            
        } catch (error) {
            console.log('Currency detection failed, defaulting to GBP');
            return 'GBP';
        }
    }
    
    scrollToPaymentSection() {
        console.log('StripeCheckout: Auto-scrolling to payment section');
        
        // Wait a bit for the DOM to be fully rendered
        setTimeout(() => {
            const checkoutContainer = document.getElementById('stripe-checkout-container');
            if (checkoutContainer) {
                // Scroll to the checkout section with smooth animation
                checkoutContainer.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                console.log('StripeCheckout: Scrolled to payment section');
            } else {
                console.warn('StripeCheckout: Could not find checkout container for scrolling');
            }
        }, 300); // Small delay to ensure elements are rendered
    }
    
    injectStyles() {
        if (document.getElementById('stripe-checkout-styles')) {
            return; // Styles already injected
        }
        
        const style = document.createElement('style');
        style.id = 'stripe-checkout-styles';
        style.textContent = `
            .stripe-checkout-wrapper {
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 16px;
                -webkit-font-smoothing: antialiased;
                max-width: 500px;
                margin: 40px auto;
                box-shadow: 0px 0px 0px 0.5px rgba(50, 50, 93, 0.1),
                    0px 2px 5px 0px rgba(50, 50, 93, 0.1), 
                    0px 1px 1.5px 0px rgba(0, 0, 0, 0.07);
                border-radius: 12px;
                padding: 40px;
                background: white;
                opacity: 0;
                animation: fadeInUp 0.6s ease-out forwards;
            }
            
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .checkout-header {
                text-align: center;
                margin-bottom: 30px;
            }
            
            .checkout-header h2 {
                color: #30313d;
                margin: 0 0 8px 0;
                font-size: 24px;
                font-weight: 600;
            }
            
            .package-info {
                color: #667eea;
                font-size: 18px;
                font-weight: 600;
                margin: 8px 0;
            }
            
            .security-info {
                color: #6b7280;
                font-size: 14px;
                margin: 8px 0;
            }
            
            .form-section {
                margin-bottom: 24px;
            }
            
            .form-section h4 {
                color: #30313d;
                margin: 0 0 12px 0;
                font-size: 16px;
                font-weight: 600;
            }
            
            .form-section label {
                display: block;
                color: #30313d;
                font-weight: 600;
                margin-bottom: 6px;
            }
            
            .email-input {
                width: 100%;
                padding: 12px;
                border: 1px solid #e5e5e5;
                border-radius: 6px;
                font-size: 16px;
                background: #ffffff;
                color: #30313d;
                box-sizing: border-box;
                transition: border-color 0.2s ease;
            }
            
            .email-input:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }
            
            .email-input.error {
                border-color: #df1b41;
                box-shadow: 0 0 0 3px rgba(223, 27, 65, 0.1);
            }
            
            .error-message {
                color: #df1b41;
                font-size: 14px;
                margin-top: 6px;
            }
            
            .payment-element,
            .address-element {
                margin-top: 12px;
            }
            
            .stripe-submit-button {
                width: 100%;
                background: #667eea;
                color: #ffffff;
                border: none;
                border-radius: 8px;
                padding: 16px 24px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                margin-top: 24px;
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .stripe-submit-button:hover:not(:disabled) {
                background: #5a67d8;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            }
            
            .stripe-submit-button:disabled {
                opacity: 0.7;
                cursor: not-allowed;
                transform: none;
            }
            
            .spinner {
                width: 20px;
                height: 20px;
                border: 2px solid transparent;
                border-top: 2px solid #ffffff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            .spinner.hidden {
                display: none;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .payment-messages {
                margin-top: 16px;
                padding: 12px;
                border-radius: 6px;
                font-size: 14px;
                text-align: center;
            }
            
            .payment-messages.error {
                background: #fef2f2;
                color: #dc2626;
                border: 1px solid #fecaca;
            }
            
            @media (max-width: 600px) {
                .stripe-checkout-wrapper {
                    margin: 20px;
                    padding: 24px;
                }
            }
            
            /* Hide Link payment option and Optional sections */
            #link-authentication-element,
            .LinkAuthenticationElement,
            .p-LinkAutofillConsentCheckbox,
            /* Hide any fieldset with "Optional" legend */
            fieldset:has(legend:contains("Optional")),
            fieldset legend:contains("Optional"),
            /* Hide by Stripe classes */
            .p-Fieldset--optional,
            .p-Fieldset[data-testid*="optional"],
            /* Hide any section containing Link signup text */
            *:has(*:contains("Save my information for faster checkout")),
            div:contains("Save my information for faster checkout"),
            section:contains("Save my information for faster checkout") {
                display: none !important;
                visibility: hidden !important;
                height: 0 !important;
                overflow: hidden !important;
                opacity: 0 !important;
            }
            
        `;
        
        document.head.appendChild(style);
    }
};

console.log('StripeCheckout class defined successfully');
console.log('StripeCheckout type:', typeof window.StripeCheckout);
console.log('StripeCheckout constructor check:', window.StripeCheckout instanceof Function);

// Don't auto-initialize - let the router handle it