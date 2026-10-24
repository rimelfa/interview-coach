// Check if already loaded to prevent redeclaration
if (window.PricingPage) {
    console.log('PricingPage already exists, skipping redeclaration');
} else {
    console.log('Declaring PricingPage class');

    window.PricingPage = class PricingPage {
        constructor() {
            console.log('PricingPage constructor called');
            this.currentCurrency = this.detectUserCurrency();
        }

        async init(container) {
            console.log('PricingPage init called');
            
            try {
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

                // Set up event listeners after DOM is ready
                setTimeout(() => this.setupEventListeners(), 100);
                
                // Make this instance globally available for toggleCurrency
                window.pricingPage = this;
                
                console.log('PricingPage initialized successfully');
            } catch (error) {
                console.error('Error initializing pricing page:', error);
            }
        }

        setupEventListeners() {
            console.log('Setting up pricing page event listeners');
            
            // Find all pricing buttons and add event listeners
            const pricingButtons = document.querySelectorAll('.pricing-button[data-plan]');
            console.log('Found pricing buttons:', pricingButtons.length);
            
            pricingButtons.forEach(button => {
                const plan = button.getAttribute('data-plan');
                console.log('Adding event listener for plan:', plan);
                
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('Button clicked for plan:', plan);
                    this.purchasePlan(plan);
                });
            });

        }

        getHTML() {
            // Get localized pricing
            const pricing = this.getLocalizedPricing();
            
            return `
                <div class="pricing-container">
                    <div class="pricing-header">
                        <h1>Simple, Transparent Pricing</h1>
                        <p>One-time payment, no subscriptions. Choose the plan that fits your needs.</p>
                    </div>

                    <div class="pricing-grid">
                        <!-- Basic Plan -->
                        <div class="pricing-card">
                            <h3 class="pricing-title">Basic</h3>
                            <div class="pricing-price">${pricing.currency}${pricing.basic}</div>
                            <div class="pricing-period">One-time payment</div>
                            <ul class="pricing-features">
                                <li><strong>50 interview questions</strong></li>
                                <li><strong>Valid for 1 month</strong></li>
                            </ul>
                            <button class="pricing-button" data-plan="basic">
                                Get Basic
                            </button>
                        </div>

                        <!-- Plus Plan -->
                        <div class="pricing-card popular">
                            <div class="popular-badge">Best Value</div>
                            <h3 class="pricing-title">Plus</h3>
                            <div class="pricing-price">${pricing.currency}${pricing.plus}</div>
                            <div class="pricing-period">One-time payment</div>
                            <ul class="pricing-features">
                                <li><strong>100 interview questions</strong></li>
                                <li><strong>Valid for 2 months</strong></li>
                            </ul>
                            <button class="pricing-button" data-plan="plus">
                                Get Plus
                            </button>
                        </div>

                    </div>
                    
                    <!-- Common Features Section -->
                    <div class="common-features-section">
                        <h2>Including:</h2>
                        <div class="common-features-grid">
                            <div class="feature-item" style="border-color: rgba(16,185,129,0.35); background: linear-gradient(135deg, rgba(16,185,129,0.06), transparent);">
                                <div class="pricing-feat-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
                                <h3>Live AI Interview Panel</h3>
                                <p>Two AI interviewers — Daniel and Priya — run a full mock session, switching between them just like a real panel interview</p>
                            </div>
                            <div class="feature-item" style="border-color: rgba(16,185,129,0.35); background: linear-gradient(135deg, rgba(16,185,129,0.06), transparent);">
                                <div class="pricing-feat-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg></div>
                                <h3>Real Follow-Up Questions</h3>
                                <p>The AI listens to what you actually say and follows up on it — probing vague answers, asking for numbers, and pulling on loose threads</p>
                            </div>
                            <div class="feature-item" style="border-color: rgba(16,185,129,0.35); background: linear-gradient(135deg, rgba(16,185,129,0.06), transparent);">
                                <div class="pricing-feat-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></div>
                                <h3>Full Performance Debrief</h3>
                                <p>After every session: per-question scores, delivery stats (pace, fillers, repetitions), suggested stronger answers, and tips on what to improve</p>
                            </div>
                            <div class="feature-item">
                                <div class="pricing-feat-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M3 21v-1a8 8 0 0 1 16 0v1"/></svg></div>
                                <h3>Tailored to Your Profile</h3>
                                <p>Questions personalized based on your experience, role, and target industry</p>
                            </div>
                            <div class="feature-item">
                                <div class="pricing-feat-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg></div>
                                <h3>Voice & Text Practice</h3>
                                <p>Practice with both voice recording and text input to build confidence in any interview format</p>
                            </div>
                            <div class="feature-item">
                                <div class="pricing-feat-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></div>
                                <h3>Multi-Language Support</h3>
                                <p>Practice interviews in multiple languages to prepare for global opportunities</p>
                            </div>
                            <div class="feature-item">
                                <div class="pricing-feat-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
                                <h3>AI-Powered Feedback</h3>
                                <p>Get instant, detailed feedback on your responses with actionable improvement suggestions</p>
                            </div>
                            <div class="feature-item">
                                <div class="pricing-feat-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
                                <h3>Progress Tracking</h3>
                                <p>Monitor your improvement over time with detailed progress charts and milestones</p>
                            </div>
                            <div class="feature-item">
                                <div class="pricing-feat-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="3" width="4" height="18"/></svg></div>
                                <h3>Performance Analytics</h3>
                                <p>Deep insights into your interview performance, strengths, and areas for improvement</p>
                            </div>
                        </div>
                    </div>

                    <div class="pricing-note">
                        <p>All plans are one-time payments with no recurring charges.</p>
                    </div>
                </div>
            `;
        }

        detectUserCurrency() {
            try {
                // Check for test parameter in URL (for testing purposes)
                const urlParams = new URLSearchParams(window.location.search);
                const testLocale = urlParams.get('locale');
                if (testLocale) {
                    console.log(`🧪 TEST MODE: Using locale ${testLocale} from URL parameter`);
                    return this.getCurrencyFromLocale(testLocale);
                }
                
                // Get user's locale from browser
                const locale = navigator.language || navigator.languages[0] || 'en-US';
                console.log(`🌍 Browser locale detected: ${locale}`);
                console.log(`🌍 All browser languages:`, navigator.languages);
                
                const currency = this.getCurrencyFromLocale(locale);
                console.log(`💰 Final currency selected: ${currency}`);
                
                return currency;
                
            } catch (error) {
                console.log('Currency detection failed, defaulting to USD');
                return 'USD';
            }
        }

        getCurrencyFromLocale(locale) {
            // Check for UK locales first (including variants)
            if (locale.toLowerCase().includes('en-gb') || locale.toLowerCase().includes('en-uk')) {
                console.log(`🇬🇧 Detected UK locale variant: ${locale} → GBP`);
                return 'GBP';
            }
            
            // Map browser locales to currencies
            const currencyMap = {
                // UK/British locales
                'en-GB': 'GBP',
                'en-UK': 'GBP',
                
                // Eurozone countries
                'de': 'EUR', 'de-DE': 'EUR', 'de-AT': 'EUR',
                'fr': 'EUR', 'fr-FR': 'EUR', 'fr-BE': 'EUR',
                'es': 'EUR', 'es-ES': 'EUR',
                'it': 'EUR', 'it-IT': 'EUR',
                'nl': 'EUR', 'nl-NL': 'EUR', 'nl-BE': 'EUR',
                'pt': 'EUR', 'pt-PT': 'EUR',
                'fi': 'EUR', 'fi-FI': 'EUR',
                'sv': 'EUR', 'sv-SE': 'EUR',
                'da': 'EUR', 'da-DK': 'EUR',
                'no': 'EUR', 'no-NO': 'EUR',
                'pl': 'EUR', 'pl-PL': 'EUR',
                'cs': 'EUR', 'cs-CZ': 'EUR',
                'sk': 'EUR', 'sk-SK': 'EUR',
                'hu': 'EUR', 'hu-HU': 'EUR',
                'ro': 'EUR', 'ro-RO': 'EUR',
                'bg': 'EUR', 'bg-BG': 'EUR',
                'hr': 'EUR', 'hr-HR': 'EUR',
                'et': 'EUR', 'et-EE': 'EUR',
                'lv': 'EUR', 'lv-LV': 'EUR',
                'lt': 'EUR', 'lt-LT': 'EUR',
                'sl': 'EUR', 'sl-SI': 'EUR',
                'mt': 'EUR', 'mt-MT': 'EUR',
                'cy': 'EUR', 'el-CY': 'EUR',
                'el': 'EUR', 'el-GR': 'EUR',
                
                // Canadian locales
                'en-CA': 'CAD',
                'fr-CA': 'CAD',
                
                // Australian locales
                'en-AU': 'AUD',
                
                // All other English and unrecognized locales default to USD
                'en': 'USD',
                'en-US': 'USD',
                'en-NZ': 'USD', // New Zealand -> USD for now
                'en-ZA': 'USD', // South Africa -> USD
                'en-IN': 'USD', // India -> USD
                'en-SG': 'USD', // Singapore -> USD
                'en-HK': 'USD', // Hong Kong -> USD
                'en-MY': 'USD', // Malaysia -> USD
                'en-PH': 'USD', // Philippines -> USD
                
                // Middle East & Asia (default to USD)
                'ar': 'USD', 'ar-SA': 'USD', 'ar-AE': 'USD', 'ar-EG': 'USD',
                'zh': 'USD', 'zh-CN': 'USD', 'zh-TW': 'USD', 'zh-HK': 'USD',
                'ja': 'USD', 'ja-JP': 'USD',
                'ko': 'USD', 'ko-KR': 'USD',
                'hi': 'USD', 'hi-IN': 'USD',
                'th': 'USD', 'th-TH': 'USD',
                'vi': 'USD', 'vi-VN': 'USD',
                'id': 'USD', 'id-ID': 'USD',
                
                // Americas (default to USD)
                'es-MX': 'USD', 'es-AR': 'USD', 'es-CL': 'USD', 'es-CO': 'USD',
                'pt-BR': 'USD',
                'ru': 'USD', 'ru-RU': 'USD'
            };
            
            // Try exact match first
            const currency = currencyMap[locale];
            if (currency) {
                console.log(`🌍 Detected currency ${currency} from locale ${locale}`);
                return currency;
            }
            
            // Try language code without country
            const languageCode = locale.split('-')[0];
            const fallbackCurrency = currencyMap[languageCode];
            if (fallbackCurrency) {
                console.log(`🌍 Detected currency ${fallbackCurrency} from language ${languageCode} (locale: ${locale})`);
                return fallbackCurrency;
            }
            
            // Default to USD for any unrecognized locale
            console.log(`🌍 Unknown locale ${locale}, defaulting to USD`);
            return 'USD';
        }

        getLocalizedPricing() {
            const pricing = {
                GBP: { 
                    basic: '6.99', 
                    plus: '10.99', 
                    currency: '£', 
                    currencyName: 'British Pounds',
                    code: 'GBP'
                },
                USD: { 
                    basic: '8.99', 
                    plus: '13.99', 
                    currency: '$', 
                    currencyName: 'US Dollars',
                    code: 'USD'
                },
                EUR: { 
                    basic: '7.99', 
                    plus: '12.99', 
                    currency: '€', 
                    currencyName: 'Euros',
                    code: 'EUR'
                },
                CAD: { 
                    basic: '11.99', 
                    plus: '18.99', 
                    currency: 'C$', 
                    currencyName: 'Canadian Dollars',
                    code: 'CAD'
                },
                AUD: { 
                    basic: '12.99', 
                    plus: '19.99', 
                    currency: 'A$', 
                    currencyName: 'Australian Dollars',
                    code: 'AUD'
                }
            };

            return pricing[this.currentCurrency] || pricing.GBP;
        }


        injectStyles() {
            const existingStyle = document.getElementById('pricing-page-styles');
            if (existingStyle) {
                existingStyle.remove();
            }
            
            const styleElement = document.createElement('style');
            styleElement.id = 'pricing-page-styles';
            styleElement.textContent = this.getStyles();
            document.head.appendChild(styleElement);
        }

        getStyles() {
            return `
            :root {
                --mint: #a7f3d0;
                --sky: #bae6fd;
                --sun: #fde68a;
                --peach: #fdba74;
                --ink: #1f2937;
                --muted: #64748b;
                --card: #ffffff;
                --shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
            }

            body {
                background:
                    radial-gradient(900px 520px at 12% -15%, #fef9c3 0%, rgba(254, 249, 195, 0) 55%),
                    radial-gradient(900px 520px at 92% -5%, #bae6fd 0%, rgba(186, 230, 253, 0) 55%),
                    linear-gradient(180deg, #f0fdf4 0%, #ecfeff 100%);
                min-height: 100vh;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                color: var(--ink);
            }

            .pricing-container {
                max-width: 1100px;
                margin: 32px auto 50px;
                padding: 0 20px;
            }

            .pricing-header {
                text-align: center;
                margin-bottom: 42px;
                background: linear-gradient(135deg, #e0f2fe 0%, #fef9c3 55%, #dcfce7 100%);
                padding: 34px 32px;
                border-radius: 28px;
                box-shadow: 0 18px 34px rgba(15, 23, 42, 0.12);
                border: 1px solid rgba(255, 255, 255, 0.9);
            }

            .pricing-header h1 {
                font-size: 2.4em;
                color: var(--ink);
                margin-bottom: 12px;
                font-weight: 800;
            }

            .pricing-header p {
                font-size: 1.1em;
                color: var(--muted);
                margin: 0;
                line-height: 1.6;
            }

            .pricing-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 28px;
                margin-bottom: 50px;
            }

            .pricing-card {
                background: var(--card);
                border: 1px solid rgba(226, 232, 240, 0.7);
                padding: 36px 32px;
                border-radius: 24px;
                box-shadow: var(--shadow);
                text-align: center;
                position: relative;
                transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
            }

            .pricing-card:hover {
                transform: translateY(-6px);
                box-shadow: 0 22px 40px rgba(15, 23, 42, 0.12);
                border-color: rgba(125, 211, 252, 0.7);
            }

            .pricing-card.popular {
                border: 2px solid rgba(125, 211, 252, 0.9);
                box-shadow: 0 26px 44px rgba(56, 189, 248, 0.2);
            }

            .popular-badge {
                position: absolute;
                top: -14px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #bae6fd 0%, #a7f3d0 100%);
                color: #0f172a;
                padding: 8px 18px;
                border-radius: 999px;
                font-size: 0.85em;
                font-weight: 700;
                box-shadow: 0 8px 16px rgba(56, 189, 248, 0.25);
            }

            .pricing-title {
                font-size: 1.7em;
                color: var(--ink);
                margin-bottom: 16px;
                font-weight: 800;
            }

            .pricing-price {
                font-size: 2.8em;
                color: #0ea5e9;
                font-weight: 800;
                margin-bottom: 8px;
            }

            .pricing-period {
                color: var(--muted);
                margin-bottom: 24px;
                font-size: 1.05em;
            }

            .pricing-features {
                list-style: none;
                padding: 0;
                margin: 24px 0;
                text-align: left;
            }

            .pricing-features li {
                padding: 10px 0;
                color: var(--muted);
                border-bottom: 1px solid rgba(226, 232, 240, 0.6);
                position: relative;
                padding-left: 22px;
            }

            .pricing-features li:before {
                content: '';
                position: absolute;
                left: 0;
                width: 8px;
                height: 8px;
                background: linear-gradient(135deg, #a7f3d0 0%, #bae6fd 100%);
                border-radius: 50%;
                top: 50%;
                transform: translateY(-50%);
            }

            .pricing-features li:last-child {
                border-bottom: none;
            }

            .pricing-button {
                width: 100%;
                padding: 14px 26px;
                background: linear-gradient(135deg, #7dd3fc 0%, #86efac 100%);
                color: #0f172a;
                border: none;
                border-radius: 999px;
                font-size: 1.05em;
                font-weight: 700;
                cursor: pointer;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                margin-top: 16px;
            }

            .pricing-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 24px rgba(56, 189, 248, 0.3);
            }

            .pricing-note {
                text-align: center;
                background: var(--card);
                border: 1px solid rgba(226, 232, 240, 0.7);
                padding: 26px;
                border-radius: 22px;
                box-shadow: var(--shadow);
            }

            .pricing-note p {
                color: var(--muted);
                margin: 0;
                font-size: 1.05em;
                line-height: 1.6;
            }

            /* Common Features Section */
            .common-features-section {
                margin: 50px 0;
                text-align: center;
            }

            .common-features-section h2 {
                font-size: 2.1em;
                color: var(--ink);
                margin-bottom: 28px;
                font-weight: 800;
            }

            .common-features-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 24px;
                max-width: 1100px;
                margin: 0 auto;
            }

            .feature-item {
                background: var(--card);
                border: 1px solid rgba(226, 232, 240, 0.7);
                padding: 26px 22px;
                border-radius: 22px;
                box-shadow: var(--shadow);
                transition: transform 0.25s ease, box-shadow 0.25s ease;
                text-align: center;
            }

            .feature-item:hover {
                transform: translateY(-4px);
                box-shadow: 0 18px 34px rgba(15, 23, 42, 0.12);
            }

            .pricing-feat-icon {
                display: flex;
                justify-content: center;
                margin-bottom: 0.75rem;
                opacity: 0.85;
            }

            .feature-item h3 {
                font-size: 1.2em;
                color: var(--ink);
                margin-bottom: 10px;
                font-weight: 700;
            }

            .feature-item p {
                color: var(--muted);
                margin: 0;
                line-height: 1.6;
                font-size: 0.95em;
            }

            @media (max-width: 768px) {
                .pricing-container {
                    padding: 0 14px;
                }

                .pricing-card.popular {
                    transform: none;
                }

                .pricing-grid {
                    gap: 22px;
                }

                .pricing-header h1 {
                    font-size: 2em;
                }

                .pricing-price {
                    font-size: 2.4em;
                }

                .common-features-section h2 {
                    font-size: 1.8em;
                }

                .common-features-grid {
                    grid-template-columns: 1fr;
                    gap: 18px;
                }
            }

            @media (max-width: 1024px) and (min-width: 769px) {
                .common-features-grid {
                    grid-template-columns: repeat(2, 1fr);
                    gap: 20px;
                }
            }
            `;
        }


        async purchasePlan(plan) {
            // Check if authManager is available and user is authenticated
            if (typeof authManager === 'undefined') {
                console.error('Authentication system not loaded');
                window.location.href = '/login?redirect=pricing';
                return;
            }

            if (!authManager.isAuthenticated()) {
                // Show loading state on button while redirecting
                const button = event.target;
                const originalText = button.textContent;
                button.textContent = 'Redirecting...';
                button.disabled = true;

                // Store the selected plan in sessionStorage for after login
                sessionStorage.setItem('selectedPlan', plan);
                // Directly redirect to signup page - no alert popup
                window.location.href = '/signup?redirect=pricing&plan=' + plan;
                return;
            }

            try {
                // Show loading state
                const button = event.target;
                const originalText = button.textContent;
                button.textContent = 'Processing...';
                button.disabled = true;

                console.log('Purchase plan called with:', plan);

                // Map plan names to package IDs
                const packageMap = {
                    'basic': 1,      // 50 questions for £6.99
                    'plus': 2        // 100 questions for £10.99
                };

                const packageId = packageMap[plan];
                console.log('Package ID:', packageId);
                
                if (!packageId) {
                    throw new Error(`Invalid plan: ${plan}`);
                }

                const requestBody = {
                    packageId: packageId,
                    successUrl: `${window.location.origin}/payment-success?payment=success`,
                    cancelUrl: `${window.location.origin}/pricing?payment=cancelled`,
                    currency: this.currentCurrency
                };

                console.log('Request body:', requestBody);
                console.log('Auth token:', authManager.getToken());
                
                // Navigate to embedded checkout using router
                const checkoutPath = `/checkout?package=${packageId}`;
                console.log('Navigating to embedded checkout:', checkoutPath);
                
                // Use the router to navigate
                if (window.router) {
                    window.router.navigate(checkoutPath);
                } else {
                    // Fallback to direct URL change
                    window.location.href = checkoutPath;
                }
                
            } catch (error) {
                console.error('Error purchasing plan:', error);
                alert('Failed to initiate payment. Please try again.');
                
                // Reset button state
                const button = event.target;
                button.textContent = button.dataset.originalText || 'Get Started';
                button.disabled = false;
            }
        }

        destroy() {
            // Remove page-specific styles
            const styles = document.getElementById('pricing-page-styles');
            if (styles) {
                styles.remove();
            }
        }
    };

    console.log('PricingPage class declared successfully');
}
