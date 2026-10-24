// Check if already loaded to prevent redeclaration
if (window.EmailVerificationPage) {
    console.log('EmailVerificationPage already exists, skipping redeclaration');
} else {
    console.log('Declaring EmailVerificationPage class');

    window.EmailVerificationPage = class EmailVerificationPage {
        constructor() {
            console.log('EmailVerificationPage constructor called');
            this.token = null;
            this.verificationAttempted = false;
        }

        async init(container) {
            console.log('EmailVerificationPage init called');
            
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

                // Get verification token from URL and start verification
                this.extractTokenAndVerify();
                
                console.log('EmailVerificationPage initialized successfully');
            } catch (error) {
                console.error('Error initializing email verification page:', error);
            }
        }

        getHTML() {
            return `
                <div class="verification-container">
                    <div id="loadingState" class="verification-state loading">
                        <div class="verification-icon">⏳</div>
                        <h1>Verifying Your Email...</h1>
                        <p>Please wait while we verify your email address.</p>
                        <div class="spinner"></div>
                    </div>
                    
                    <div id="successState" class="verification-state success" style="display: none;">
                        <div class="verification-icon">✅</div>
                        <h1>Email Verified Successfully!</h1>
                        <p>Welcome to Good Chat! Your account has been activated and you're now logged in.</p>
                        <p class="redirect-message">Redirecting you to practice in 2 seconds...</p>
                        <div class="verification-actions">
                            <a href="/practice" class="verification-btn primary">Start Practicing</a>
                            <a href="/" class="verification-btn secondary">Go to Home</a>
                        </div>
                    </div>
                    
                    <div id="errorState" class="verification-state error" style="display: none;">
                        <div class="verification-icon">❌</div>
                        <h1>Verification Failed</h1>
                        <p id="errorMessage">The verification link is invalid or has expired.</p>
                        <div class="verification-actions">
                            <a href="/signup" class="verification-btn secondary">Sign Up Again</a>
                            <a href="/support" class="verification-btn primary">Contact Support</a>
                        </div>
                    </div>
                </div>
            `;
        }

        extractTokenAndVerify() {
            // Prevent multiple verification attempts globally
            if (window.emailVerificationInProgress || this.verificationAttempted) {
                console.log('Verification already attempted, skipping');
                return;
            }
            
            // Get verification token from URL
            const urlParams = new URLSearchParams(window.location.search);
            this.token = urlParams.get('token');
            
            // Debug logging
            console.log('URL params:', window.location.search);
            console.log('Token extracted:', this.token);
            console.log('All parameters:', Array.from(urlParams.entries()));
            
            if (!this.token || this.token.trim() === '') {
                this.showError('No verification token provided in the URL.');
                return;
            }
            
            // Set flags to prevent duplicate attempts
            window.emailVerificationInProgress = true;
            this.verificationAttempted = true;
            console.log('Starting email verification with token:', this.token);
            this.verifyEmail(this.token);
        }

        async verifyEmail(token) {
            try {
                console.log('Sending verification request...');
                
                const response = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                const data = await response.json();
                console.log('Verification response:', response.status, data);
                
                if (response.ok) {
                    // Store the token for automatic login
                    if (data.token) {
                        localStorage.setItem('authToken', data.token);
                        localStorage.setItem('user', JSON.stringify(data.user));
                    }
                    this.showSuccess(data);
                } else {
                    this.showError(data.error || 'Verification failed');
                }
                
                // Clear the global flag when verification completes
                window.emailVerificationInProgress = false;
            } catch (error) {
                console.error('Verification network error:', error);
                this.showError('Network error. Please check your connection and try again.');
                // Clear the global flag on error too
                window.emailVerificationInProgress = false;
            }
        }
        
        showSuccess(data = {}) {
            console.log('Showing success state');
            document.getElementById('loadingState').style.display = 'none';
            document.getElementById('errorState').style.display = 'none';
            document.getElementById('successState').style.display = 'block';
            
            // Optional: Update success message with user data
            if (data.user && data.user.name) {
                const successTitle = document.querySelector('#successState h1');
                if (successTitle) {
                    // Extract just the first name
                    const firstName = data.user.name.split(' ')[0];
                    successTitle.textContent = `Welcome, ${firstName}!`;
                }
            }
            
            // Redirect after short delay
            setTimeout(() => {
                console.log('Redirecting to practice page...');
                window.location.href = '/practice';
            }, 2000);
        }
        
        showError(message) {
            console.log('Showing error state:', message);
            document.getElementById('loadingState').style.display = 'none';
            document.getElementById('successState').style.display = 'none';
            
            const errorMessageEl = document.getElementById('errorMessage');
            if (errorMessageEl) {
                errorMessageEl.textContent = message;
            }
            
            document.getElementById('errorState').style.display = 'block';
        }

        injectStyles() {
            const existingStyle = document.getElementById('email-verification-styles');
            if (existingStyle) {
                existingStyle.remove();
            }
            
            const styleElement = document.createElement('style');
            styleElement.id = 'email-verification-styles';
            styleElement.textContent = this.getStyles();
            document.head.appendChild(styleElement);
        }

        getStyles() {
            return `
            body {
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                min-height: 100vh;
            }

            .verification-container {
                max-width: 600px;
                margin: 80px auto;
                padding: 40px;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 16px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                text-align: center;
            }

            .verification-state h1 {
                color: #2d3748;
                font-size: 28px;
                margin-bottom: 15px;
                font-weight: 700;
            }

            .verification-state p {
                color: #4a5568;
                font-size: 16px;
                line-height: 1.6;
                margin-bottom: 30px;
            }

            .redirect-message {
                color: #667eea !important;
                font-weight: 600 !important;
                font-size: 14px !important;
                margin-bottom: 20px !important;
            }

            .verification-icon {
                font-size: 64px;
                margin-bottom: 20px;
                display: block;
            }

            .loading {
                color: #667eea;
            }

            .success {
                color: #48bb78;
            }

            .error {
                color: #e53e3e;
            }

            .spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #e2e8f0;
                border-top: 4px solid #667eea;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 20px auto;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .verification-actions {
                display: flex;
                gap: 15px;
                justify-content: center;
                flex-wrap: wrap;
                margin-top: 30px;
            }

            .verification-btn {
                display: inline-block;
                padding: 12px 30px;
                border-radius: 8px;
                font-weight: 600;
                text-decoration: none;
                transition: all 0.3s ease;
                font-size: 16px;
                min-width: 120px;
            }

            .verification-btn.primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }

            .verification-btn.primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            }

            .verification-btn.secondary {
                background: #e2e8f0;
                color: #4a5568;
                border: 1px solid #cbd5e0;
            }

            .verification-btn.secondary:hover {
                background: #cbd5e0;
                transform: translateY(-1px);
            }

            @media (max-width: 768px) {
                .verification-container {
                    margin: 40px 20px;
                    padding: 30px 20px;
                }

                .verification-state h1 {
                    font-size: 24px;
                }

                .verification-icon {
                    font-size: 48px;
                }

                .verification-actions {
                    flex-direction: column;
                    align-items: center;
                }

                .verification-btn {
                    width: 100%;
                    max-width: 200px;
                }
            }
            `;
        }

        destroy() {
            // Remove page-specific styles
            const styles = document.getElementById('email-verification-styles');
            if (styles) {
                styles.remove();
            }
        }
    };

    console.log('EmailVerificationPage class declared successfully');
}
