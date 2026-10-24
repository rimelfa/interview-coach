class Router {
    constructor() {
        this.routes = new Map();
        this.currentPage = null;
        this.container = null;
        
        // Initialize router
        this.init();
    }

    init() {
        // Find the main content container
        this.container = document.getElementById('app-container') || document.getElementById('app') || document.querySelector('main') || document.body;
        
        // Register routes
        this.registerRoute('/practice', async () => {
            document.documentElement.classList.add('practice-dark');
            const script = document.createElement('script');
            script.src = '/src/pages/practice.js?v=' + Date.now();
            document.head.appendChild(script);

            return new Promise((resolve) => {
                script.onload = () => {
                    resolve(new window.PracticePage());
                };
            });
        });
        
        this.registerRoute('/test', async () => {
            const script = document.createElement('script');
            script.src = '/src/pages/test-practice.js';
            document.head.appendChild(script);
            
            return new Promise((resolve) => {
                script.onload = () => {
                    resolve(new window.TestPracticePage());
                };
            });
        });
        
        this.registerRoute('/profile', async () => {
            const script = document.createElement('script');
            script.src = '/src/pages/profile.js';
            document.head.appendChild(script);
            
            return new Promise((resolve) => {
                script.onload = () => {
                    resolve(new window.ProfilePage());
                };
            });
        });
        
        this.registerRoute('/edit-profile', async () => {
            const script = document.createElement('script');
            script.src = '/src/pages/edit-profile.js';
            document.head.appendChild(script);
            
            return new Promise((resolve) => {
                script.onload = () => {
                    resolve(new window.EditProfilePage());
                };
            });
        });
        
        this.registerRoute('/verify-email', async () => {
            const script = document.createElement('script');
            script.src = '/src/pages/email-verification.js';
            document.head.appendChild(script);
            
            return new Promise((resolve) => {
                script.onload = () => {
                    resolve(new window.EmailVerificationPage());
                };
            });
        });
        
        this.registerRoute('/check-email', async () => {
            const script = document.createElement('script');
            script.src = '/src/pages/check-email.js';
            document.head.appendChild(script);
            
            return new Promise((resolve) => {
                script.onload = () => {
                    resolve(new window.CheckEmailPage());
                };
            });
        });
        
        this.registerRoute('/login', async () => {
            // Check if LoginPage is already loaded
            if (window.LoginPage) {
                console.log('LoginPage already loaded, reusing existing class');
                const loginPageInstance = new window.LoginPage();
                window.loginPage = loginPageInstance; // Set global instance for onclick handlers
                return loginPageInstance;
            }
            
            // Check if script is already in the DOM
            const existingScript = document.querySelector('script[src="/src/pages/login.js"]');
            if (existingScript) {
                console.log('Login script already exists, waiting for it to load...');
                // Wait for the existing script to load
                return new Promise((resolve) => {
                    if (window.LoginPage) {
                        const loginPageInstance = new window.LoginPage();
                        window.loginPage = loginPageInstance;
                        resolve(loginPageInstance);
                    } else {
                        existingScript.onload = () => {
                            const loginPageInstance = new window.LoginPage();
                            window.loginPage = loginPageInstance;
                            resolve(loginPageInstance);
                        };
                    }
                });
            }
            
            const script = document.createElement('script');
            script.src = '/src/pages/login.js';
            document.head.appendChild(script);
            
            return new Promise((resolve) => {
                script.onload = () => {
                    const loginPageInstance = new window.LoginPage();
                    window.loginPage = loginPageInstance; // Set global instance for onclick handlers
                    resolve(loginPageInstance);
                };
            });
        });
        
        this.registerRoute('/forgot-password', async () => {
            // Check if ForgotPasswordPage is already loaded
            if (window.ForgotPasswordPage) {
                console.log('ForgotPasswordPage already loaded, reusing existing class');
                return new window.ForgotPasswordPage();
            }
            
            // Check if script is already in the DOM
            const existingScript = document.querySelector('script[src="/src/pages/forgot-password.js"]');
            if (existingScript) {
                console.log('ForgotPassword script already exists, waiting for it to load...');
                return new Promise((resolve) => {
                    if (window.ForgotPasswordPage) {
                        resolve(new window.ForgotPasswordPage());
                    } else {
                        existingScript.onload = () => {
                            resolve(new window.ForgotPasswordPage());
                        };
                    }
                });
            }
            
            const script = document.createElement('script');
            script.src = '/src/pages/forgot-password.js';
            document.head.appendChild(script);
            
            return new Promise((resolve) => {
                script.onload = () => {
                    resolve(new window.ForgotPasswordPage());
                };
            });
        });
        
        this.registerRoute('/reset-password', async () => {
            // Check if ResetPasswordPage is already loaded
            if (window.ResetPasswordPage) {
                console.log('ResetPasswordPage already loaded, reusing existing class');
                const resetPasswordPageInstance = new window.ResetPasswordPage();
                window.resetPasswordPage = resetPasswordPageInstance;
                return resetPasswordPageInstance;
            }
            
            // Check if script is already in the DOM
            const existingScript = document.querySelector('script[src="/src/pages/reset-password.js"]');
            if (existingScript) {
                console.log('ResetPassword script already exists, waiting for it to load...');
                return new Promise((resolve) => {
                    if (window.ResetPasswordPage) {
                        const resetPasswordPageInstance = new window.ResetPasswordPage();
                        window.resetPasswordPage = resetPasswordPageInstance;
                        resolve(resetPasswordPageInstance);
                    } else {
                        existingScript.onload = () => {
                            const resetPasswordPageInstance = new window.ResetPasswordPage();
                            window.resetPasswordPage = resetPasswordPageInstance;
                            resolve(resetPasswordPageInstance);
                        };
                    }
                });
            }
            
            const script = document.createElement('script');
            script.src = '/src/pages/reset-password.js';
            document.head.appendChild(script);
            
            return new Promise((resolve) => {
                script.onload = () => {
                    const resetPasswordPageInstance = new window.ResetPasswordPage();
                    window.resetPasswordPage = resetPasswordPageInstance; // Set global instance for onclick handlers
                    resolve(resetPasswordPageInstance);
                };
            });
        });
        
        this.registerRoute('/signup', async () => {
            const script = document.createElement('script');
            script.src = '/src/pages/signup.js';
            document.head.appendChild(script);
            
            return new Promise((resolve) => {
                script.onload = () => {
                    resolve(new window.SignupPage());
                };
            });
        });
        
        this.registerRoute('/payment-success', async () => {
            // Check if PaymentSuccessPage is already loaded
            if (window.PaymentSuccessPage) {
                console.log('PaymentSuccessPage already loaded, reusing existing class');
                const paymentSuccessPageInstance = new window.PaymentSuccessPage();
                window.paymentSuccessPage = paymentSuccessPageInstance;
                return paymentSuccessPageInstance;
            }
            
            const script = document.createElement('script');
            script.src = '/src/pages/payment-success.js';
            document.head.appendChild(script);
            
            return new Promise((resolve) => {
                script.onload = () => {
                    console.log('Payment success script loaded, creating instance...');
                    try {
                        const paymentSuccessPageInstance = new window.PaymentSuccessPage();
                        window.paymentSuccessPage = paymentSuccessPageInstance;
                        console.log('paymentSuccessPage instance created successfully:', !!window.paymentSuccessPage);
                        console.log('paymentSuccessPage has init method:', typeof paymentSuccessPageInstance.init === 'function');
                        resolve(paymentSuccessPageInstance);
                    } catch (error) {
                        console.error('Error creating payment success page instance:', error);
                        resolve(null);
                    }
                };
                script.onerror = () => {
                    console.error('Failed to load payment success script');
                    resolve(null);
                };
            });
        });
        
        this.registerRoute('/pricing', async () => {
            // Check if PricingPage is already loaded
            if (window.PricingPage) {
                console.log('PricingPage already loaded, reusing existing class');
                const pricingPageInstance = new window.PricingPage();
                window.pricingPage = pricingPageInstance;
                return pricingPageInstance;
            }
            
            const script = document.createElement('script');
            script.src = '/src/pages/pricing.js';
            document.head.appendChild(script);
            
            return new Promise((resolve) => {
                script.onload = () => {
                    console.log('Pricing script loaded, creating instance...');
                    try {
                        const pricingPageInstance = new window.PricingPage();
                        window.pricingPage = pricingPageInstance; // Set global instance for onclick handlers
                        console.log('pricingPage instance created successfully:', !!window.pricingPage);
                        console.log('pricingPage has init method:', typeof pricingPageInstance.init === 'function');
                        resolve(pricingPageInstance);
                    } catch (error) {
                        console.error('Error creating pricing page instance:', error);
                        resolve(null);
                    }
                };
                script.onerror = () => {
                    console.error('Failed to load pricing script');
                    resolve(null);
                };
            });
        });
        
        this.registerRoute('/about', async () => {
            // Check if AboutPage is already loaded
            if (window.AboutPage) {
                console.log('AboutPage already loaded, reusing existing class');
                return new window.AboutPage();
            }
            
            const script = document.createElement('script');
            script.src = '/src/pages/about.js';
            document.head.appendChild(script);
            
            return new Promise((resolve) => {
                script.onload = () => {
                    try {
                        const aboutPageInstance = new window.AboutPage();
                        resolve(aboutPageInstance);
                    } catch (error) {
                        console.error('Error creating about page instance:', error);
                        resolve(null);
                    }
                };
                script.onerror = () => {
                    console.error('Failed to load about script');
                    resolve(null);
                };
            });
        });
        
        this.registerRoute('/terms', async () => {
            // Check if TermsPage is already loaded
            if (window.TermsPage) {
                console.log('TermsPage already loaded, reusing existing class');
                return new window.TermsPage();
            }
            
            // Check if script is already in the DOM
            const existingScript = document.querySelector('script[src="/src/pages/terms.js"]');
            if (existingScript) {
                console.log('Terms script already exists, waiting for it to load...');
                return new Promise((resolve) => {
                    if (window.TermsPage) {
                        resolve(new window.TermsPage());
                    } else {
                        existingScript.onload = () => {
                            resolve(new window.TermsPage());
                        };
                    }
                });
            }
            
            const script = document.createElement('script');
            script.src = '/src/pages/terms.js';
            document.head.appendChild(script);
            
            return new Promise((resolve) => {
                script.onload = () => {
                    try {
                        const termsPageInstance = new window.TermsPage();
                        resolve(termsPageInstance);
                    } catch (error) {
                        console.error('Error creating terms page instance:', error);
                        resolve(null);
                    }
                };
                script.onerror = () => {
                    console.error('Failed to load terms script');
                    resolve(null);
                };
            });
        });
        
        this.registerRoute('/contact', async () => {
            // Check if ContactPage is already loaded
            if (window.ContactPage) {
                console.log('ContactPage already loaded, reusing existing class');
                return new window.ContactPage();
            }
            
            const script = document.createElement('script');
            script.src = '/src/pages/contact.js';
            document.head.appendChild(script);
            
            return new Promise((resolve) => {
                script.onload = () => {
                    try {
                        const contactPageInstance = new window.ContactPage();
                        resolve(contactPageInstance);
                    } catch (error) {
                        console.error('Error creating contact page instance:', error);
                        resolve(null);
                    }
                };
                script.onerror = () => {
                    console.error('Failed to load contact script');
                    resolve(null);
                };
            });
        });
        
        this.registerRoute('/privacy', async () => {
            // Check if PrivacyPage is already loaded
            if (window.PrivacyPage) {
                console.log('PrivacyPage already loaded, reusing existing class');
                return new window.PrivacyPage();
            }
            
            const script = document.createElement('script');
            script.src = '/src/pages/privacy.js';
            document.head.appendChild(script);
            
            return new Promise((resolve) => {
                script.onload = () => {
                    try {
                        const privacyPageInstance = new window.PrivacyPage();
                        resolve(privacyPageInstance);
                    } catch (error) {
                        console.error('Error creating privacy page instance:', error);
                        resolve(null);
                    }
                };
                script.onerror = () => {
                    console.error('Failed to load privacy script');
                    resolve(null);
                };
            });
        });
        
        this.registerRoute('/checkout', async () => {
            // Check if CheckoutPage is already loaded
            if (window.CheckoutPage) {
                console.log('CheckoutPage already loaded, reusing existing class');
                const checkoutPageInstance = new window.CheckoutPage();
                window.checkoutPage = checkoutPageInstance;
                return checkoutPageInstance;
            }
            
            // Define the CheckoutPage class
            window.CheckoutPage = class CheckoutPage {
                constructor() {
                    this.container = null;
                }
                
                async init() {
                    console.log('Initializing checkout page...');

                    // Guard FIRST — before any DOM changes — to avoid wiping a rendered form
                    if (window._stripeCheckoutInitializing || (window.stripeCheckout && window.stripeCheckout.isInitialized)) {
                        console.log('StripeCheckout already initializing/initialized, skipping duplicate');
                        return;
                    }

                    // Create container first
                    this.container = document.createElement('div');
                    this.container.id = 'stripe-checkout-container';
                    this.container.innerHTML = `
                        <div style="text-align: center; padding: 50px;">
                            <div style="display: inline-block; width: 50px; height: 50px; border: 3px solid #667eea; border-top: 3px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                            <p style="color: black;">Loading secure checkout...</p>
                        </div>
                        <style>
                            @keyframes spin {
                                to { transform: rotate(360deg); }
                            }
                        </style>
                    `;

                    // Clear any existing content and add container
                    const pageContent = document.querySelector('.page-content');
                    if (pageContent) {
                        pageContent.innerHTML = ''; // Clear existing content
                        pageContent.appendChild(this.container);
                    }

                    // Load Stripe script if not already loaded
                    if (!window.Stripe) {
                        console.log('Loading Stripe.js...');
                        await this.loadStripeScript();
                        // Wait a bit more to ensure Stripe is fully loaded
                        await new Promise(resolve => setTimeout(resolve, 200));
                        console.log('Stripe.js loaded successfully');
                    }

                    // Load StripeCheckout component
                    if (!window.StripeCheckout) {
                        console.log('Loading StripeCheckout component...');
                        await this.loadStripeCheckoutScript();
                        console.log('StripeCheckout component loaded successfully');
                    }

                    // Now initialize the StripeCheckout
                    try {
                        if (window._stripeCheckoutInitializing || (window.stripeCheckout && window.stripeCheckout.isInitialized)) {
                            console.log('StripeCheckout already initializing/initialized after script load, skipping');
                            return;
                        }
                        window._stripeCheckoutInitializing = true;
                        console.log('Creating StripeCheckout instance...');
                        window.stripeCheckout = new window.StripeCheckout();
                        console.log('Initializing StripeCheckout...');
                        await window.stripeCheckout.init();
                        window._stripeCheckoutInitializing = false;
                        console.log('StripeCheckout initialized successfully');
                    } catch (error) {
                        window._stripeCheckoutInitializing = false;
                        console.error('Error initializing StripeCheckout:', error);
                        this.container.innerHTML = `
                            <div style="text-align: center; padding: 50px; color: red;">
                                <h3>Error Loading Checkout</h3>
                                <p>${error.message}</p>
                                <button onclick="window.location.href='/pricing'">Back to Pricing</button>
                            </div>
                        `;
                    }
                }
                
                async loadStripeScript() {
                    return new Promise((resolve, reject) => {
                        // Check if Stripe script already exists
                        const existingScript = document.querySelector('script[src="https://js.stripe.com/v3/"]');
                        if (existingScript) {
                            console.log('Stripe script already loaded');
                            resolve();
                            return;
                        }
                        
                        const script = document.createElement('script');
                        script.src = 'https://js.stripe.com/v3/';
                        script.onload = resolve;
                        script.onerror = reject;
                        document.head.appendChild(script);
                    });
                }
                
                async loadStripeCheckoutScript() {
                    return new Promise((resolve, reject) => {
                        // Check if StripeCheckout script already exists
                        const existingScript = document.querySelector('script[src="/src/components/StripeCheckout.js"]');
                        if (existingScript) {
                            console.log('StripeCheckout script already loaded');
                            // Wait a bit to ensure the class is defined
                            setTimeout(resolve, 100);
                            return;
                        }
                        
                        const script = document.createElement('script');
                        script.src = '/src/components/StripeCheckout.js';
                        script.onload = () => {
                            // Wait a bit for the class to be defined
                            setTimeout(resolve, 100);
                        };
                        script.onerror = reject;
                        document.head.appendChild(script);
                    });
                }
                
                render() {
                    return this.container;
                }
                
                destroy() {
                    if (this.container && this.container.parentNode) {
                        this.container.parentNode.removeChild(this.container);
                    }
                }
            };
            
            // Create and return instance
            const checkoutPageInstance = new window.CheckoutPage();
            window.checkoutPage = checkoutPageInstance;
            return checkoutPageInstance;
        });
        
        this.registerRoute('/practice-info', async () => {
            // Check if PracticeInfoPage is already loaded
            if (window.PracticeInfoPage) {
                console.log('PracticeInfoPage already loaded, reusing existing class');
                return new window.PracticeInfoPage();
            }
            
            const script = document.createElement('script');
            script.src = '/src/pages/practice-info.js';
            document.head.appendChild(script);
            
            return new Promise((resolve) => {
                script.onload = () => {
                    try {
                        const practiceInfoPageInstance = new window.PracticeInfoPage();
                        resolve(practiceInfoPageInstance);
                    } catch (error) {
                        console.error('Error creating practice info page instance:', error);
                        resolve(null);
                    }
                };
                script.onerror = () => {
                    console.error('Failed to load practice info script');
                    resolve(null);
                };
            });
        });
        
        this.registerRoute('/dashboard-info', async () => {
            // Check if DashboardInfoPage is already loaded
            if (window.DashboardInfoPage) {
                console.log('DashboardInfoPage already loaded, reusing existing class');
                return new window.DashboardInfoPage();
            }
            
            const script = document.createElement('script');
            script.src = '/src/pages/dashboard-info.js';
            document.head.appendChild(script);
            
            return new Promise((resolve) => {
                script.onload = () => {
                    try {
                        const dashboardInfoPageInstance = new window.DashboardInfoPage();
                        resolve(dashboardInfoPageInstance);
                    } catch (error) {
                        console.error('Error creating dashboard info page instance:', error);
                        resolve(null);
                    }
                };
                script.onerror = () => {
                    console.error('Failed to load dashboard info script');
                    resolve(null);
                };
            });
        });
        
        this.registerRoute('/features', async () => {
            // Check if FeaturesPage is already loaded
            if (window.FeaturesPage) {
                console.log('FeaturesPage already loaded, reusing existing class');
                return new window.FeaturesPage();
            }
            
            const script = document.createElement('script');
            script.src = '/src/pages/features.js';
            document.head.appendChild(script);
            
            return new Promise((resolve) => {
                script.onload = () => {
                    try {
                        const featuresPageInstance = new window.FeaturesPage();
                        resolve(featuresPageInstance);
                    } catch (error) {
                        console.error('Error creating features page instance:', error);
                        resolve(null);
                    }
                };
                script.onerror = () => {
                    console.error('Failed to load features script');
                    resolve(null);
                };
            });
        });
        
        this.registerRoute('/how-it-works', async () => {
            // Check if HowItWorksPage is already loaded
            if (window.HowItWorksPage) {
                console.log('HowItWorksPage already loaded, reusing existing class');
                return new window.HowItWorksPage();
            }
            
            const script = document.createElement('script');
            script.src = '/src/pages/how-it-works.js';
            document.head.appendChild(script);
            
            return new Promise((resolve) => {
                script.onload = () => {
                    try {
                        const howItWorksPageInstance = new window.HowItWorksPage();
                        resolve(howItWorksPageInstance);
                    } catch (error) {
                        console.error('Error creating how it works page instance:', error);
                        resolve(null);
                    }
                };
                script.onerror = () => {
                    console.error('Failed to load how it works script');
                    resolve(null);
                };
            });
        });
        
        this.registerRoute('/dashboard', async () => {
            return new Promise((resolve, reject) => {
                // Check if DashboardPage is already available
                if (window.DashboardPage) {
                    const dashboardPageInstance = new window.DashboardPage();
                    window.dashboardPage = dashboardPageInstance;
                    resolve(dashboardPageInstance);
                    return;
                }

                // Check if script is already loading
                const existingScript = document.querySelector('script[src="/src/pages/dashboard.js"]');
                if (existingScript) {
                    existingScript.addEventListener('load', () => {
                        if (window.DashboardPage) {
                            const dashboardPageInstance = new window.DashboardPage();
                            window.dashboardPage = dashboardPageInstance;
                            resolve(dashboardPageInstance);
                        } else {
                            reject(new Error('DashboardPage not available after script load'));
                        }
                    });
                    return;
                }

                const script = document.createElement('script');
                script.src = '/src/pages/dashboard.js';
                
                script.onload = () => {
                    if (window.DashboardPage) {
                        const dashboardPageInstance = new window.DashboardPage();
                        window.dashboardPage = dashboardPageInstance;
                        resolve(dashboardPageInstance);
                    } else {
                        reject(new Error('DashboardPage constructor not available'));
                    }
                };
                
                script.onerror = () => {
                    reject(new Error('Failed to load dashboard.js'));
                };
                
                document.head.appendChild(script);
            });
        });
        
        // Listen for navigation events
        window.addEventListener('popstate', this.handleNavigation.bind(this));
        
        // Handle initial page load
        this.handleNavigation();
    }

    registerRoute(path, pageFactory) {
        this.routes.set(path, pageFactory);
    }

    async navigate(path) {
        // Update browser history
        if (window.location.pathname !== path) {
            window.history.pushState(null, '', path);
        }
        
        await this.loadPage(path);
    }

    async handleNavigation() {
        const path = window.location.pathname;
        await this.loadPage(path);
    }

    async loadPage(path) {
        try {
            console.log('Loading page:', path);

            // Reset Stripe checkout flags when navigating away from checkout
            if (!path.startsWith('/checkout')) {
                window._stripeCheckoutInitializing = false;
                if (window.stripeCheckout) {
                    window.stripeCheckout.isInitialized = false;
                    window.stripeCheckout = null;
                }
            }

            // Clean up current page
            if (this.currentPage && typeof this.currentPage.cleanup === 'function') {
                this.currentPage.cleanup();
            }

            // Strip query parameters for route matching
            const routePath = path.split('?')[0];
            
            // Check if we have a route for this path
            if (this.routes.has(routePath)) {
                console.log('Found route for:', routePath, '(original path:', path, ')');
                
                // Hide the home page content immediately
                this.hideHomePage();
                
                // Add a delayed second call to ensure home page content stays hidden
                setTimeout(() => {
                    this.hideHomePage();
                }, 150);
                
                // Show the page content area
                const contentArea = document.querySelector('.page-content');
                if (contentArea) {
                    contentArea.style.display = 'block';
                    // Clear any existing content immediately to prevent flash
                    contentArea.innerHTML = '';
                }
                console.log('Content area shown, loading page class...');
                
                const pageFactory = this.routes.get(routePath);
                const PageClass = await pageFactory();
                
                console.log('Page class loaded:', PageClass);
                console.log('PageClass type:', typeof PageClass);
                console.log('PageClass constructor name:', PageClass?.constructor?.name);
                this.currentPage = PageClass;
                
                // Check if the page class has an init method, otherwise assume it's already initialized
                if (typeof this.currentPage.init === 'function') {
                    console.log('Calling init() method on page...');
                    await this.currentPage.init(this.container);
                    console.log('Page init() completed');
                } else {
                    console.log('Page does not have init() method or init is not a function');
                    console.log('Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.currentPage)));
                }
                console.log('Page initialization process complete');
            } else if (path === '/') {
                console.log('Showing home page');
                // Show home page content
                this.showHomePage();
            } else {
                // Handle unknown routes - could redirect to 404 or home
                console.warn(`No route found for path: ${path}`);
            }
        } catch (error) {
            console.error('Error loading page:', error, error.stack);
        }
    }

    hideHomePage() {
        console.log('Aggressively hiding all home page content...');
        
        // Add spa-page class to body for styling
        document.body.classList.add('spa-page');
        document.body.classList.remove('authenticated-user');
        
        // NUCLEAR OPTION: Hide ALL potential home page content with !important
        const allHomeSections = [
            '.hero-section', '.features-section', '.stats-section', '.how-it-works-section', 
            '.testimonials-section', '.faq-section', '.cta-section', '.hero', '.hero-content',
            '.hero-title', '.hero-subtitle', '.hero-buttons', '.features', '.stats', 
            '.how-it-works', '.testimonials', '.faq', '.cta', 'main.home-content', 
            'section.home', '.welcome-section', '.authenticated-user-content',
            '[class*="welcome"]', '[id*="welcome"]', '.user-welcome', '.dashboard-welcome',
            '.hero-btn', '.section-title', '.floating-element', '.particles-container'
        ];
        
        allHomeSections.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.setProperty('display', 'none', 'important');
                element.style.setProperty('visibility', 'hidden', 'important');
                element.style.setProperty('opacity', '0', 'important');
                element.style.setProperty('height', '0', 'important');
                element.style.setProperty('max-height', '0', 'important');
                element.style.setProperty('overflow', 'hidden', 'important');
                element.style.setProperty('margin', '0', 'important');
                element.style.setProperty('padding', '0', 'important');
                element.style.setProperty('border', 'none', 'important');
                element.style.setProperty('position', 'absolute', 'important');
                element.style.setProperty('left', '-9999px', 'important');
                element.style.setProperty('z-index', '-9999', 'important');
            });
        });
        
        // Also hide any main element that doesn't have the spa-content class
        const homeMain = document.querySelector('main');
        if (homeMain && !homeMain.classList.contains('spa-content')) {
            homeMain.style.setProperty('display', 'none', 'important');
            homeMain.style.setProperty('visibility', 'hidden', 'important');
            homeMain.style.setProperty('position', 'absolute', 'important');
            homeMain.style.setProperty('left', '-9999px', 'important');
        }
        
        // Create and inject CSS to force hide home content
        const forceHideStyle = document.createElement('style');
        forceHideStyle.id = 'force-hide-home-content';
        forceHideStyle.textContent = `
            /* Only hide home page sections that are NOT inside .page-content */
            body.spa-page > .container > .hero-section,
            body.spa-page > .hero-section,
            body.spa-page > .container > .features-section:not(.page-content .features-section),
            body.spa-page > .features-section:not(.page-content .features-section),
            body.spa-page > .container > .stats-section:not(.page-content .stats-section),
            body.spa-page > .stats-section:not(.page-content .stats-section),
            body.spa-page > .container > .how-it-works-section:not(.page-content .how-it-works-section),
            body.spa-page > .how-it-works-section:not(.page-content .how-it-works-section),
            body.spa-page > .container > .testimonials-section:not(.page-content .testimonials-section),
            body.spa-page > .testimonials-section:not(.page-content .testimonials-section),
            body.spa-page > .container > .faq-section:not(.page-content .faq-section),
            body.spa-page > .faq-section:not(.page-content .faq-section),
            body.spa-page > .container > .cta-section:not(.page-content .cta-section),
            body.spa-page > .cta-section:not(.page-content .cta-section),
            body.spa-page > .container > .interview-guides-section:not(.page-content .interview-guides-section),
            body.spa-page > .interview-guides-section:not(.page-content .interview-guides-section),
            body.spa-page > .hero,
            body.spa-page > .container > .hero,
            body.spa-page > .hero-content,
            body.spa-page > .container > .hero-content,
            body.spa-page > .authenticated-user-content,
            body.spa-page > .container > .authenticated-user-content,
            body.spa-page > main:not(.spa-content),
            body.spa-page > .container > main:not(.spa-content),
            body.spa-page > [class*="welcome"]:not(.page-content [class*="welcome"]),
            body.spa-page > .container > [class*="welcome"]:not(.page-content [class*="welcome"]),
            body.spa-page > [id*="welcome"]:not(.page-content [id*="welcome"]),
            body.spa-page > .container > [id*="welcome"]:not(.page-content [id*="welcome"]) {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                height: 0 !important;
                max-height: 0 !important;
                overflow: hidden !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                position: absolute !important;
                left: -9999px !important;
                z-index: -9999 !important;
            }
        `;
        
        // Remove any existing force-hide style and add new one
        const existingStyle = document.getElementById('force-hide-home-content');
        if (existingStyle) {
            existingStyle.remove();
        }
        document.head.appendChild(forceHideStyle);
        
        // Show the navigation which should always be visible
        const navigation = document.querySelector('.top-navigation');
        if (navigation) {
            navigation.style.display = 'flex';
            navigation.style.setProperty('display', 'flex', 'important');
            navigation.style.setProperty('visibility', 'visible', 'important');
            navigation.style.setProperty('position', 'relative', 'important');
            navigation.style.setProperty('left', 'auto', 'important');
            navigation.style.setProperty('z-index', '1000', 'important');
        }
        
        console.log('Home page content aggressively hidden');
    }

    showHomePage() {
        console.log('Router showHomePage called');
        
        // Hide SPA content area but keep navigation
        const contentArea = document.querySelector('.page-content');
        if (contentArea) {
            contentArea.style.display = 'none';
        }
        
        // Remove all page-related classes from body
        document.body.classList.remove('spa-page');
        document.body.classList.remove('authenticated-user');
        
        // Remove any force-hide styles that might be interfering
        const forceHideStyle = document.getElementById('force-hide-marketing');
        if (forceHideStyle) {
            forceHideStyle.remove();
            console.log('Removed force-hide styles from router');
        }
        
        // Remove aggressive home content hiding styles
        const aggressiveHideStyle = document.getElementById('force-hide-home-content');
        if (aggressiveHideStyle) {
            aggressiveHideStyle.remove();
            console.log('Removed aggressive home content hiding styles');
        }
        
        // Remove any authenticated user content
        const authenticatedContent = document.querySelector('.authenticated-user-content');
        if (authenticatedContent) {
            authenticatedContent.remove();
            console.log('Removed authenticated user content from router');
        }
        
        // Show home page content
        const sections = document.querySelectorAll('.hero-section, .features-section, .stats-section, .how-it-works-section, .testimonials-section, .faq-section, .cta-section');
        console.log(`Found ${sections.length} sections to show`);
        
        sections.forEach(section => {
            // Remove all inline styles that might be hiding sections
            section.removeAttribute('style');
            // Set proper display values
            if (section.classList.contains('hero-section')) {
                section.style.display = 'flex';
            } else {
                section.style.display = 'block';
            }
            section.style.visibility = 'visible';
            console.log(`Restored section: ${section.className}`);
        });
        
        // Ensure navigation is visible
        const navigation = document.querySelector('.top-navigation');
        if (navigation) {
            navigation.style.display = 'flex';
        }
        
        // Force a reflow to ensure changes take effect
        document.body.offsetHeight;
        
        // Trigger home page content update based on authentication
        if (typeof window.initHomePageContent === 'function') {
            console.log('Calling initHomePageContent from router');
            setTimeout(() => {
                window.initHomePageContent();
            }, 50);
        }
        
        console.log('Router showHomePage completed');
    }

    // Helper method to programmatically navigate
    static navigate(path) {
        if (window.router) {
            window.router.navigate(path);
        }
    }
}

// Initialize router when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.router = new Router();
});

// Export for global access
window.Router = Router;