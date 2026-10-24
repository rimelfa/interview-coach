// Check if already loaded to prevent redeclaration
if (window.CheckEmailPage) {
    console.log('CheckEmailPage already exists, skipping redeclaration');
} else {
    console.log('Declaring CheckEmailPage class');

    window.CheckEmailPage = class CheckEmailPage {
        constructor() {
            console.log('CheckEmailPage constructor called');
        }

        async init(container) {
            console.log('CheckEmailPage init called');
            
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

                // Get email from URL parameter if available
                const urlParams = new URLSearchParams(window.location.search);
                const email = urlParams.get('email');
                if (email) {
                    const emailSpan = document.querySelector('.user-email');
                    if (emailSpan) {
                        emailSpan.textContent = email;
                        document.querySelector('.email-message').style.display = 'block';
                        document.querySelector('.generic-message').style.display = 'none';
                        
                        // Store email for resend functionality
                        this.userEmail = email;
                    }
                }
                
                // Setup resend button functionality
                this.setupResendButton();
                
                console.log('CheckEmailPage initialized successfully');
            } catch (error) {
                console.error('Error initializing check email page:', error);
            }
        }

        setupResendButton() {
            const resendBtn = document.getElementById('resend-email-btn');
            if (!resendBtn) return;

            // Check if there's a cooldown from localStorage
            const lastResendTime = localStorage.getItem('lastResendTime');
            const initialSendTime = localStorage.getItem('initialEmailSendTime');
            
            if (lastResendTime) {
                // Check cooldown from last resend
                const timeElapsed = Date.now() - parseInt(lastResendTime);
                const cooldownRemaining = 59000 - timeElapsed;
                
                if (cooldownRemaining > 0) {
                    this.startCountdown(Math.ceil(cooldownRemaining / 1000));
                }
            } else if (!initialSendTime || Date.now() - parseInt(initialSendTime) > 86400000) {
                // If no initial send time or it's been more than 24 hours, set new initial time
                // This means user just signed up or it's been a day since signup
                localStorage.setItem('initialEmailSendTime', Date.now().toString());
                this.startCountdown(59);
            } else {
                // Check cooldown from initial send
                const timeElapsed = Date.now() - parseInt(initialSendTime);
                const cooldownRemaining = 59000 - timeElapsed;
                
                if (cooldownRemaining > 0) {
                    this.startCountdown(Math.ceil(cooldownRemaining / 1000));
                }
            }

            resendBtn.addEventListener('click', async () => {
                if (resendBtn.disabled) return;
                
                // If no email is available, prompt user
                if (!this.userEmail) {
                    const statusDiv = document.querySelector('.resend-status');
                    statusDiv.style.display = 'block';
                    statusDiv.className = 'resend-status error';
                    statusDiv.textContent = 'Please enter your email address to resend verification.';
                    return;
                }

                await this.resendVerificationEmail();
            });
        }

        async resendVerificationEmail() {
            const resendBtn = document.getElementById('resend-email-btn');
            const statusDiv = document.querySelector('.resend-status');
            
            // Disable button
            resendBtn.disabled = true;
            statusDiv.style.display = 'none';
            
            try {
                const response = await fetch('/api/auth/resend-verification', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email: this.userEmail })
                });

                const data = await response.json();

                if (response.ok) {
                    // Show success message
                    statusDiv.style.display = 'block';
                    statusDiv.className = 'resend-status success';
                    statusDiv.textContent = 'Verification email sent! Please check your inbox and spam/promotions folder.';
                    
                    // Store the time of resend
                    localStorage.setItem('lastResendTime', Date.now().toString());
                    
                    // Start countdown
                    this.startCountdown(59);
                } else if (response.status === 429) {
                    // Rate limited - show countdown
                    statusDiv.style.display = 'block';
                    statusDiv.className = 'resend-status error';
                    statusDiv.textContent = data.error;
                    
                    if (data.remainingSeconds) {
                        this.startCountdown(data.remainingSeconds);
                    }
                } else {
                    // Show error message
                    statusDiv.style.display = 'block';
                    statusDiv.className = 'resend-status error';
                    statusDiv.textContent = data.error || 'Failed to resend verification email.';
                    resendBtn.disabled = false;
                }
            } catch (error) {
                console.error('Error resending verification email:', error);
                statusDiv.style.display = 'block';
                statusDiv.className = 'resend-status error';
                statusDiv.textContent = 'An error occurred. Please try again later.';
                resendBtn.disabled = false;
            }
        }

        startCountdown(seconds) {
            const resendBtn = document.getElementById('resend-email-btn');
            const btnText = resendBtn.querySelector('.btn-text');
            const countdown = resendBtn.querySelector('.countdown');
            
            resendBtn.disabled = true;
            btnText.style.display = 'none';
            countdown.style.display = 'inline';
            
            let remaining = seconds;
            
            const updateCountdown = () => {
                if (remaining > 0) {
                    countdown.textContent = `Please wait ${remaining} seconds`;
                    remaining--;
                    setTimeout(updateCountdown, 1000);
                } else {
                    // Reset button
                    btnText.style.display = 'inline';
                    countdown.style.display = 'none';
                    resendBtn.disabled = false;
                    
                    // Clear the lastResendTime but keep initialEmailSendTime
                    localStorage.removeItem('lastResendTime');
                    
                    // If this was the initial countdown, clear that too
                    const initialSendTime = localStorage.getItem('initialEmailSendTime');
                    if (initialSendTime) {
                        const timeElapsed = Date.now() - parseInt(initialSendTime);
                        if (timeElapsed >= 59000) {
                            localStorage.removeItem('initialEmailSendTime');
                        }
                    }
                }
            };
            
            updateCountdown();
        }

        getHTML() {
            return `
                <div class="check-email-container">
                    <div class="check-email-icon">📧</div>
                    <h1>Check Your Email</h1>
                    
                    <div class="email-message" style="display: none;">
                        <p>We've sent a verification email to <strong class="user-email"></strong></p>
                    </div>
                    
                    <div class="generic-message">
                        <p>We've sent a verification email to your email address.</p>
                    </div>
                    
                    <div class="spam-notice">
                        <div class="spam-notice-icon">⚠️</div>
                        <p><strong>Can't find the email?</strong></p>
                        <p>Please check your <strong>Spam</strong> or <strong>Promotions</strong> folder. Sometimes verification emails end up there.</p>
                    </div>
                    
                    <div class="resend-section">
                        <p class="resend-message">Didn't receive the email?</p>
                        <button id="resend-email-btn" class="resend-btn">
                            <span class="btn-text">Resend Verification Email</span>
                            <span class="countdown" style="display: none;"></span>
                        </button>
                        <div class="resend-status" style="display: none;"></div>
                    </div>
                    
                </div>
            `;
        }

        injectStyles() {
            const existingStyle = document.getElementById('check-email-styles');
            if (existingStyle) {
                existingStyle.remove();
            }
            
            const styleElement = document.createElement('style');
            styleElement.id = 'check-email-styles';
            styleElement.textContent = this.getStyles();
            document.head.appendChild(styleElement);
        }

        getStyles() {
            return `
            body {
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                min-height: 100vh;
            }

            .check-email-container {
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

            .check-email-icon {
                font-size: 80px;
                margin-bottom: 20px;
                display: block;
            }

            .check-email-container h1 {
                color: #2d3748;
                font-size: 32px;
                margin-bottom: 20px;
                font-weight: 700;
            }

            .check-email-container p {
                color: #4a5568;
                font-size: 18px;
                line-height: 1.6;
                margin-bottom: 30px;
            }

            .user-email {
                color: #667eea;
                font-weight: 600;
            }

            .spam-notice {
                background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
                border: 1px solid #ffc107;
                border-radius: 12px;
                padding: 20px;
                margin: 30px 0;
                text-align: center;
            }

            .spam-notice-icon {
                font-size: 24px;
                margin-bottom: 10px;
                display: block;
            }

            .spam-notice p {
                margin-bottom: 12px;
                color: #856404;
                font-size: 16px;
            }

            .spam-notice p:last-child {
                margin-bottom: 0;
            }

            .whitelist-tip {
                font-size: 14px !important;
                color: #6c5200 !important;
                font-style: italic;
            }

            .resend-section {
                margin-top: 40px;
                padding-top: 30px;
                border-top: 1px solid rgba(0, 0, 0, 0.1);
            }

            .resend-message {
                color: #718096;
                font-size: 16px;
                margin-bottom: 20px;
            }

            .resend-btn {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            }

            .resend-btn:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
            }

            .resend-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }

            .countdown {
                display: inline-block;
                min-width: 150px;
            }

            .resend-status {
                margin-top: 20px;
                padding: 12px 20px;
                border-radius: 8px;
                font-size: 14px;
                line-height: 1.5;
            }

            .resend-status.success {
                background-color: #c6f6d5;
                color: #22543d;
                border: 1px solid #9ae6b4;
            }

            .resend-status.error {
                background-color: #fed7d7;
                color: #742a2a;
                border: 1px solid #fc8181;
            }

            @media (max-width: 768px) {
                .check-email-container {
                    margin: 40px 20px;
                    padding: 30px 20px;
                }

                .check-email-container h1 {
                    font-size: 28px;
                }

                .check-email-icon {
                    font-size: 60px;
                }

            }
            `;
        }

        destroy() {
            // Remove page-specific styles
            const styles = document.getElementById('check-email-styles');
            if (styles) {
                styles.remove();
            }
        }
    };

    console.log('CheckEmailPage class declared successfully');
}