// Prevent redeclaration if script is loaded multiple times
if (typeof window.ForgotPasswordPage === 'undefined') {
    class ForgotPasswordPage {
    constructor() {
        this.form = null;
        this.submitBtn = null;
        this.loadingSpinner = null;
        this.successMessage = null;
        this.errorAlert = null;
        this.cooldownTimer = null;
        this.cooldownSeconds = 0;
    }

    async init() {
        try {
            console.log('Initializing forgot password page...');
            
            this.injectStyles();
            
            // Set page content - find or create content area, preserving navigation
            let contentArea = document.querySelector('.page-content');
            if (!contentArea) {
                contentArea = document.createElement('div');
                contentArea.className = 'page-content';
                const container = document.querySelector('.container');
                if (container) {
                    container.appendChild(contentArea);
                }
            }
            
            if (contentArea) {
                contentArea.innerHTML = this.getHTML();
            }

            // Initialize form elements
            this.initializeElements();
            
            // Set up form submission
            this.setupFormHandling();

            // Force the h1 color to be much darker
            const h1Element = document.querySelector('.auth-header h1');
            if (h1Element) {
                console.log('Found h1 element:', h1Element);
                console.log('Current computed color:', window.getComputedStyle(h1Element).color);
                h1Element.style.setProperty('color', '#ff0000', 'important');
                console.log('After setting color:', window.getComputedStyle(h1Element).color);
                console.log('Element style:', h1Element.style.color);
            } else {
                console.log('H1 element not found');
            }

            console.log('Forgot password page initialized successfully');
        } catch (error) {
            console.error('Error in ForgotPasswordPage init:', error);
        }
    }

    getHTML() {
        return `
            <div class="auth-container">
                <div class="auth-card">
                    <div class="auth-header">
                        <h1 style="color: #000000 !important;">Reset Your Password</h1>
                        <p>Enter your email address and we'll send you a link to reset your password</p>
                    </div>

                    <div class="loading-spinner" id="loadingSpinner"></div>
                    
                    <div class="success-message" id="successMessage"></div>
                    <div class="error-alert" id="errorAlert"></div>

                    <form id="forgotPasswordForm">
                        <div class="form-group">
                            <label for="email">Email Address</label>
                            <input type="email" id="email" name="email" required>
                            <div class="error-message">Please enter a valid email address</div>
                        </div>

                        <button type="submit" class="submit-btn" id="submitBtn">
                            Send Reset Link
                        </button>
                    </form>

                    <div class="auth-footer">
                        <p>Remember your password? <a href="/login">Sign in here</a></p>
                    </div>
                </div>
            </div>
        `;
    }

    getStyles() {
        return `
        body {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
        }

        .auth-container {
            max-width: 400px;
            margin: 80px auto;
            padding: 20px;
        }

        .auth-card {
            background: rgba(255, 255, 255, 0.95);
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .auth-header {
            text-align: center;
            margin-bottom: 30px;
        }

        .auth-container .auth-card .auth-header h1 {
            color: #374151 !important;
            background: none !important;
            -webkit-background-clip: unset !important;
            -webkit-text-fill-color: #374151 !important;
            background-clip: unset !important;
            margin-bottom: 10px;
            font-size: 2em;
            font-weight: 700;
        }

        .auth-header p {
            color: #4a5568;
            margin: 0;
            opacity: 0.9;
            line-height: 1.5;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #2d3748;
        }

        .form-group input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 16px;
            transition: all 0.3s ease;
            background: rgba(255, 255, 255, 0.9);
        }

        .form-group input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-group input.error {
            border-color: #f56565;
            box-shadow: 0 0 0 3px rgba(245, 101, 101, 0.1);
        }

        .form-group .error-message {
            color: #e53e3e;
            font-size: 14px;
            margin-top: 5px;
            display: none;
        }

        .form-group.error .error-message {
            display: block;
        }

        .submit-btn {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 10px;
        }

        .submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }

        .submit-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }

        .auth-footer {
            text-align: center;
            margin-top: 30px;
        }

        .auth-footer p {
            color: #4a5568;
            margin: 0;
        }

        .auth-footer a {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
        }

        .auth-footer a:hover {
            text-decoration: underline;
        }

        .loading-spinner {
            display: none;
            text-align: center;
            padding: 20px;
            color: #667eea;
        }

        .loading-spinner::after {
            content: '';
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .success-message {
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
            color: white;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: none;
            font-weight: 500;
        }

        .error-alert {
            background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
            color: white;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: none;
            font-weight: 500;
        }

        @media (max-width: 480px) {
            .auth-container {
                margin: 40px auto;
                padding: 15px;
            }

            .auth-card {
                padding: 30px 20px;
            }

            .auth-header h1 {
                font-size: 1.6em;
            }
        }
        `;
    }

    injectStyles() {
        const existingStyle = document.getElementById('forgot-password-page-styles-v2');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        // Also remove old style if it exists
        const oldStyle = document.getElementById('forgot-password-page-styles');
        if (oldStyle) {
            oldStyle.remove();
        }
        
        const styleElement = document.createElement('style');
        styleElement.id = 'forgot-password-page-styles-v2';
        styleElement.textContent = this.getStyles();
        document.head.appendChild(styleElement);
    }

    initializeElements() {
        this.form = document.getElementById('forgotPasswordForm');
        this.submitBtn = document.getElementById('submitBtn');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.successMessage = document.getElementById('successMessage');
        this.errorAlert = document.getElementById('errorAlert');
    }

    setupFormHandling() {
        if (!this.form) return;
        
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSubmit();
        });
    }

    async handleSubmit() {
        // Check if cooldown is active
        if (this.cooldownSeconds > 0) {
            this.showError(`Please wait ${this.cooldownSeconds} seconds before requesting another reset email.`);
            return;
        }

        const emailInput = document.getElementById('email');
        const email = emailInput.value.trim();

        // Validate email
        if (!email) {
            this.showError('Please enter your email address');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            this.showError('Please enter a valid email address');
            return;
        }

        try {
            this.showLoading(true);
            this.clearMessages();

            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.showSuccess(data.message);
                // Clear the form
                this.form.reset();
                // Start cooldown timer
                this.startCooldown();
            } else {
                this.showError(data.error || 'Failed to send password reset email. Please try again.');
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            this.showError('An error occurred. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    showLoading(show) {
        if (!this.loadingSpinner || !this.submitBtn) return;
        
        if (show) {
            this.loadingSpinner.style.display = 'block';
            this.submitBtn.disabled = true;
            this.submitBtn.textContent = 'Sending...';
        } else {
            this.loadingSpinner.style.display = 'none';
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = 'Send Reset Link';
        }
    }

    showError(message) {
        if (!this.errorAlert) return;
        this.errorAlert.textContent = message;
        this.errorAlert.style.display = 'block';
        if (this.successMessage) {
            this.successMessage.style.display = 'none';
        }
    }

    showSuccess(message) {
        if (!this.successMessage) return;
        this.successMessage.textContent = message;
        this.successMessage.style.display = 'block';
        if (this.errorAlert) {
            this.errorAlert.style.display = 'none';
        }
    }

    clearMessages() {
        if (this.errorAlert) {
            this.errorAlert.style.display = 'none';
        }
        if (this.successMessage) {
            this.successMessage.style.display = 'none';
        }
    }

    startCooldown() {
        this.cooldownSeconds = 59;
        this.updateButtonState();
        
        this.cooldownTimer = setInterval(() => {
            this.cooldownSeconds--;
            this.updateButtonState();
            
            if (this.cooldownSeconds <= 0) {
                this.clearCooldown();
            }
        }, 1000);
    }

    clearCooldown() {
        if (this.cooldownTimer) {
            clearInterval(this.cooldownTimer);
            this.cooldownTimer = null;
        }
        this.cooldownSeconds = 0;
        this.updateButtonState();
    }

    updateButtonState() {
        if (!this.submitBtn) return;
        
        if (this.cooldownSeconds > 0) {
            this.submitBtn.disabled = true;
            this.submitBtn.textContent = `Resend in ${this.cooldownSeconds}s`;
            this.submitBtn.style.opacity = '0.6';
            this.submitBtn.style.cursor = 'not-allowed';
        } else {
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = 'Send Reset Link';
            this.submitBtn.style.opacity = '1';
            this.submitBtn.style.cursor = 'pointer';
        }
    }

    // Clean up when navigating away from this page
    cleanup() {
        // Clear cooldown timer
        this.clearCooldown();
        
        // Remove page-specific styles
        const styles = document.getElementById('forgot-password-page-styles-v2');
        if (styles) {
            styles.remove();
        }
        
        // Remove event listeners if needed
        if (this.form) {
            this.form.removeEventListener('submit', this.handleSubmit);
        }
    }
    }

    // Export for use in router
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ForgotPasswordPage;
    }

    // Set the class on window
    window.ForgotPasswordPage = ForgotPasswordPage;
}