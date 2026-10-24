// Prevent redeclaration if script is loaded multiple times
if (typeof window.ResetPasswordPage === 'undefined') {
    class ResetPasswordPage {
    constructor() {
        this.form = null;
        this.submitBtn = null;
        this.loadingSpinner = null;
        this.successMessage = null;
        this.errorAlert = null;
        this.token = null;
    }

    async init() {
        try {
            console.log('Initializing reset password page...');
            
            // Get token from URL
            const urlParams = new URLSearchParams(window.location.search);
            this.token = urlParams.get('token');
            
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
            
            if (!this.token) {
                this.showInvalidTokenPage(contentArea);
                return;
            }

            // Inject styles
            this.injectStyles();
            
            // Set page content
            if (contentArea) {
                contentArea.innerHTML = this.getHTML();
            }
            
            // Initialize form elements
            this.initializeElements();
            
            // Set up form submission
            this.setupFormHandling();

            console.log('Reset password page initialized successfully');
        } catch (error) {
            console.error('Error in ResetPasswordPage init:', error);
        }
    }

    showInvalidTokenPage(container = null) {
        this.injectStyles();
        
        // If no container provided, find or create one
        if (!container) {
            container = document.querySelector('.page-content');
            if (!container) {
                container = document.createElement('div');
                container.className = 'page-content';
                const mainContainer = document.querySelector('.container');
                if (mainContainer) {
                    mainContainer.appendChild(container);
                }
            }
        }
        
        container.innerHTML = `
            <div class="auth-container">
                <div class="auth-card">
                    <div class="auth-header">
                        <h1>Invalid Reset Link</h1>
                        <p>This password reset link is invalid or has expired.</p>
                    </div>
                    <div class="error-message" style="display: block; text-align: center; margin: 20px 0;">
                        The password reset link you clicked is either invalid or has expired. 
                        Please request a new password reset from the login page.
                    </div>
                    <div class="auth-footer">
                        <a href="/login" class="submit-btn" style="display: inline-block; text-decoration: none; text-align: center;">
                            Back to Login
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    getHTML() {
        return `
            <div class="auth-container">
                <div class="auth-card">
                    <div class="auth-header">
                        <h1>Reset Your Password</h1>
                        <p>Enter your new password below</p>
                    </div>

                    <div class="loading-spinner" id="loadingSpinner"></div>
                    
                    <div class="success-message" id="successMessage"></div>
                    <div class="error-alert" id="errorAlert"></div>

                    <form id="resetPasswordForm">
                        <div class="form-group">
                            <label for="newPassword">New Password</label>
                            <input type="password" id="newPassword" name="newPassword" required minlength="8">
                            <div class="error-message">Password must be at least 8 characters long</div>
                        </div>

                        <div class="form-group">
                            <label for="confirmPassword">Confirm New Password</label>
                            <input type="password" id="confirmPassword" name="confirmPassword" required minlength="8">
                            <div class="error-message">Passwords must match</div>
                        </div>

                        <button type="submit" class="submit-btn" id="submitBtn">
                            Reset Password
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
        const existingStyle = document.getElementById('reset-password-page-styles');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        const styleElement = document.createElement('style');
        styleElement.id = 'reset-password-page-styles';
        styleElement.textContent = this.getStyles();
        document.head.appendChild(styleElement);
    }

    initializeElements() {
        this.form = document.getElementById('resetPasswordForm');
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

        // Add real-time password validation
        const newPasswordInput = document.getElementById('newPassword');
        const confirmPasswordInput = document.getElementById('confirmPassword');

        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', () => {
                this.validatePasswordMatch();
            });
        }

        if (newPasswordInput) {
            newPasswordInput.addEventListener('input', () => {
                this.validatePasswordMatch();
            });
        }
    }

    validatePasswordMatch() {
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const confirmGroup = document.getElementById('confirmPassword').closest('.form-group');

        if (confirmPassword && newPassword !== confirmPassword) {
            confirmGroup.classList.add('error');
            confirmGroup.querySelector('.error-message').textContent = 'Passwords must match';
            return false;
        } else {
            confirmGroup.classList.remove('error');
        }

        // Check length
        if (newPassword.length > 0 && newPassword.length < 8) {
            const newPasswordGroup = document.getElementById('newPassword').closest('.form-group');
            newPasswordGroup.classList.add('error');
            return false;
        } else {
            const newPasswordGroup = document.getElementById('newPassword').closest('.form-group');
            newPasswordGroup.classList.remove('error');
        }

        return true;
    }

    async handleSubmit() {
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validate passwords
        if (newPassword.length < 8) {
            this.showError('Password must be at least 8 characters long');
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showError('Passwords do not match');
            return;
        }

        try {
            this.showLoading(true);
            this.clearMessages();

            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    token: this.token, 
                    newPassword 
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.showSuccess(data.message);
                // Redirect to login after successful reset
                setTimeout(() => {
                    window.location.href = '/login';
                }, 3000);
            } else {
                this.showError(data.error || 'Failed to reset password. Please try again.');
            }
        } catch (error) {
            console.error('Reset password error:', error);
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
            this.submitBtn.textContent = 'Resetting...';
        } else {
            this.loadingSpinner.style.display = 'none';
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = 'Reset Password';
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

    // Clean up when navigating away from this page
    cleanup() {
        // Remove page-specific styles
        const styles = document.getElementById('reset-password-page-styles');
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
        module.exports = ResetPasswordPage;
    }

    // Set the class on window
    window.ResetPasswordPage = ResetPasswordPage;
}

// Global instance for onclick handlers
if (typeof window.resetPasswordPage === 'undefined') {
    window.resetPasswordPage = null;
}