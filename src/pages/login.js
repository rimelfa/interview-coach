// Prevent redeclaration if script is loaded multiple times
if (typeof window.LoginPage === 'undefined') {
    class LoginPage {
    constructor() {
        this.form = null;
        this.submitBtn = null;
        this.loadingSpinner = null;
        this.successMessage = null;
        this.errorAlert = null;
    }

    getHTML() {
        return `
            <div class="auth-container">
                <div class="auth-card">
                    <div class="auth-header">
                    </div>

                    <div class="loading-spinner" id="loadingSpinner"></div>
                    
                    <div class="success-message" id="successMessage"></div>
                    <div class="error-alert" id="errorAlert"></div>

                    <form id="loginForm">
                        <div class="form-group">
                            <label for="email">Email Address</label>
                            <input type="email" id="email" name="email" required>
                            <div class="error-message">Please enter a valid email address</div>
                        </div>

                        <div class="form-group">
                            <label for="password">Password</label>
                            <input type="password" id="password" name="password" required>
                            <div class="error-message">Please enter your password</div>
                        </div>

                        <div class="forgot-password">
                            <a href="/forgot-password">Forgot your password?</a>
                        </div>

                        <button type="submit" class="submit-btn" id="submitBtn">
                            Sign In
                        </button>
                    </form>

                    <div class="divider">
                        <span>OR</span>
                    </div>

                    <div id="googleSignInButton" class="google-signin-container"></div>

                    <div class="auth-footer">
                        <p>Don't have an account? <a href="/signup">Sign up here</a></p>
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

        .auth-header h1 {
            color: #2d3748;
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
            font-size: 14px;
        }

        .form-group input {
            width: 100%;
            padding: 12px 15px;
            border: 2px solid rgba(226, 232, 240, 0.8);
            border-radius: 12px;
            font-size: 16px;
            transition: all 0.3s ease;
            box-sizing: border-box;
            background: rgba(255, 255, 255, 0.9);
        }

        .form-group input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            background: rgba(255, 255, 255, 1);
        }

        .form-group.error input {
            border-color: #e53e3e;
            box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.1);
        }

        .error-message {
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 10px;
        }

        .submit-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
        }

        .submit-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
            background: #94a3b8;
        }

        .auth-footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid rgba(226, 232, 240, 0.6);
        }

        .auth-footer a {
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
        }

        .auth-footer a:hover {
            text-decoration: underline;
        }

        .forgot-password {
            text-align: right;
            margin-bottom: 20px;
        }

        .forgot-password a {
            color: #667eea;
            text-decoration: none;
            font-size: 14px;
        }

        .forgot-password a:hover {
            text-decoration: underline;
        }

        .loading-spinner {
            display: none;
            margin: 0 auto 20px;
            width: 40px;
            height: 40px;
            border: 4px solid rgba(243, 243, 243, 0.8);
            border-top: 4px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .success-message {
            background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
            color: #155724;
            padding: 15px;
            border-radius: 12px;
            margin-bottom: 20px;
            display: none;
            border: 1px solid rgba(21, 87, 36, 0.2);
        }

        .error-alert {
            background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
            color: #721c24;
            padding: 15px;
            border-radius: 12px;
            margin-bottom: 20px;
            display: none;
            border: 1px solid rgba(114, 28, 36, 0.2);
        }

        .divider {
            position: relative;
            text-align: center;
            margin: 25px 0;
        }

        .divider::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(to right, transparent, #e2e8f0, transparent);
        }

        .divider span {
            background: rgba(255, 255, 255, 0.95);
            padding: 0 15px;
            color: #718096;
            font-size: 0.875rem;
            font-weight: 500;
            position: relative;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .google-signin-container {
            margin: 20px 0;
            text-align: center;
        }

        @media (max-width: 768px) {
            .auth-container {
                margin: 40px 20px;
            }

            .auth-card {
                padding: 30px 20px;
            }
            
        }
        `;
    }

    // Inject styles into the head
    injectStyles() {
        // Remove existing styles if present
        const existingStyles = document.getElementById('login-page-styles');
        if (existingStyles) {
            existingStyles.remove();
        }

        const styleElement = document.createElement('style');
        styleElement.id = 'login-page-styles';
        styleElement.textContent = this.getStyles();
        document.head.appendChild(styleElement);
    }

    async init() {
        try {
            console.log('Initializing login page...');
            
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
            this.form = document.getElementById('loginForm');
            this.submitBtn = document.getElementById('submitBtn');
            this.loadingSpinner = document.getElementById('loadingSpinner');
            this.successMessage = document.getElementById('successMessage');
            this.errorAlert = document.getElementById('errorAlert');

            this.setupEventListeners();
            this.checkIfAlreadyLoggedIn();

            // Initialize Google Sign-In
            await this.initGoogleSignIn();

            console.log('Login page initialized successfully');
        } catch (error) {
            console.error('Error in LoginPage init:', error);
        }
    }

    async initGoogleSignIn() {
        try {
            // Load Google Auth script if not already loaded
            if (!window.GoogleAuth) {
                const script = document.createElement('script');
                script.src = '/assets/js/google-auth.js';
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }

            // Get Google Client ID from environment or config
            // In production, this should come from your server config
            const googleClientId = await this.getGoogleClientId();
            
            if (googleClientId) {
                const googleAuth = new GoogleAuth();
                await googleAuth.init(googleClientId);
                googleAuth.renderButton('googleSignInButton', {
                    text: 'signin_with',
                    width: '100%',
                    theme: 'outline',
                    size: 'large',
                    shape: 'rectangular'
                });
                console.log('Google Sign-In initialized');
            } else {
                console.log('Google Sign-In not configured - buttons will be hidden');
                // Hide the divider and Google button container if not configured
                const divider = document.querySelector('.divider');
                const googleContainer = document.getElementById('googleSignInButton');
                if (divider) divider.style.display = 'none';
                if (googleContainer) googleContainer.style.display = 'none';
            }
        } catch (error) {
            console.error('Failed to initialize Google Sign-In:', error);
            // Hide Google sign-in elements on error
            const divider = document.querySelector('.divider');
            const googleContainer = document.getElementById('googleSignInButton');
            if (divider) divider.style.display = 'none';
            if (googleContainer) googleContainer.style.display = 'none';
        }
    }

    async getGoogleClientId() {
        try {
            // Fetch the Google Client ID from the server
            const response = await fetch('/api/config/google-client-id');
            if (response.ok) {
                const data = await response.json();
                return data.clientId;
            }
        } catch (error) {
            console.error('Failed to fetch Google Client ID:', error);
        }
        // Return null to indicate not configured
        return null;
    }

    checkIfAlreadyLoggedIn() {
        const token = localStorage.getItem('authToken');
        if (token && this.isValidToken(token)) {
            // User is already logged in, redirect to home page or redirect URL
            const urlParams = new URLSearchParams(window.location.search);
            const redirect = urlParams.get('redirect');
            if (redirect) {
                window.location.href = `/${redirect}`;
            } else {
                window.location.href = '/';
            }
        }
    }

    isValidToken(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp > Date.now() / 1000;
        } catch (error) {
            return false;
        }
    }

    setupEventListeners() {
        if (!this.form) return;

        this.form.addEventListener('submit', this.handleSubmit.bind(this));
        
        // Real-time validation
        const inputs = this.form.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('blur', this.validateField.bind(this));
            input.addEventListener('input', () => {
                this.clearFieldError(input);
            });
        });
    }

    validateField(event) {
        const field = event.target;
        const value = field.value.trim();
        const fieldGroup = field.closest('.form-group');

        if (field.type === 'email' && value && !this.isValidEmail(value)) {
            this.showFieldError(fieldGroup, 'Please enter a valid email address');
            return false;
        }

        if (field.required && !value) {
            this.showFieldError(fieldGroup, 'This field is required');
            return false;
        }

        this.clearFieldError(field);
        return true;
    }

    showFieldError(fieldGroup, message) {
        fieldGroup.classList.add('error');
        const errorElement = fieldGroup.querySelector('.error-message');
        if (errorElement) {
            errorElement.textContent = message;
        }
    }

    clearFieldError(field) {
        const fieldGroup = field.closest('.form-group');
        fieldGroup.classList.remove('error');
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showAlert(message, type = 'error') {
        this.hideAlerts();
        
        if (type === 'success') {
            this.successMessage.textContent = message;
            this.successMessage.style.display = 'block';
        } else {
            this.errorAlert.textContent = message;
            this.errorAlert.style.display = 'block';
        }

        // Scroll to top to show the alert
        if (this.errorAlert) {
            this.errorAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    hideAlerts() {
        if (this.successMessage) this.successMessage.style.display = 'none';
        if (this.errorAlert) this.errorAlert.style.display = 'none';
    }

    async handleSubmit(event) {
        event.preventDefault();
        this.hideAlerts();

        // Validate all fields
        const inputs = this.form.querySelectorAll('input[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!this.validateField({ target: input })) {
                isValid = false;
            }
        });

        if (!isValid) {
            this.showAlert('Please fix the errors above before submitting.');
            return;
        }

        // Show loading
        this.submitBtn.disabled = true;
        this.submitBtn.textContent = 'Signing In...';
        this.loadingSpinner.style.display = 'block';

        try {
            const formData = new FormData(this.form);
            const loginData = {
                email: formData.get('email'),
                password: formData.get('password')
            };

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginData)
            });

            const result = await response.json();

            if (response.ok) {
                // Store auth token and user data
                localStorage.setItem('authToken', result.token);
                localStorage.setItem('user', JSON.stringify(result.user));

                // Track login with Reddit Pixel
                if (window.redditTracking) {
                    window.redditTracking.trackLogin(result.user);
                }
                
                this.showAlert('Login successful! Redirecting...', 'success');
                this.submitBtn.textContent = 'Redirecting...';
                this.loadingSpinner.style.display = 'none';

                // Redirect after 1 second - keep button disabled
                setTimeout(() => {
                    const urlParams = new URLSearchParams(window.location.search);
                    const redirect = urlParams.get('redirect');

                    // Check if user has completed test
                    if (!result.hasCompletedTest) {
                        // User hasn't completed test, redirect to test page
                        window.location.href = '/test';
                    } else if (redirect) {
                        // User has completed test, use explicit redirect if provided
                        window.location.href = `/${redirect}`;
                    } else {
                        // User has completed test, default to dashboard
                        window.location.href = '/dashboard';
                    }
                }, 1000);
                return; // Don't execute finally block for successful login
            } else {
                throw new Error(result.error || 'Login failed');
            }

        } catch (error) {
            console.error('Login error:', error);
            this.showAlert(error.message || 'Login failed. Please check your credentials and try again.');
            // Only re-enable button on error
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = 'Sign In';
            this.loadingSpinner.style.display = 'none';
        }
    }


    // Clean up when navigating away from this page
    cleanup() {
        // Remove page-specific styles
        const styles = document.getElementById('login-page-styles');
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
        module.exports = LoginPage;
    }

    // Set the class on window
    window.LoginPage = LoginPage;
}

// Global instance for onclick handlers
if (typeof window.loginPage === 'undefined') {
    window.loginPage = null;
}