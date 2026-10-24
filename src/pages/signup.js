// Check if already loaded to prevent redeclaration
if (window.SignupPage) {
    console.log('SignupPage already exists, skipping redeclaration');
} else {
    console.log('Declaring SignupPage class');

    window.SignupPage = class SignupPage {
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
                        <h1>Create Your Account</h1>
                        <p>Join Good Chat to track your progress and improve your interview skills</p>
                    </div>

                    <div class="loading-spinner" id="loadingSpinner"></div>
                    
                    <div class="success-message" id="successMessage"></div>
                    <div class="error-alert" id="errorAlert"></div>

                    <div id="googleSignInButton" class="google-signin-container"></div>

                    <div class="divider">
                        <span>OR</span>
                    </div>

                    <form id="signupForm">
                        <!-- Row 1: First Name and Last Name -->
                        <div class="form-row">
                            <div class="form-group">
                                <label for="firstName">First Name *</label>
                                <input type="text" id="firstName" name="firstName" required>
                                <div class="error-message">Please enter your first name</div>
                            </div>
                            <div class="form-group">
                                <label for="lastName">Last Name *</label>
                                <input type="text" id="lastName" name="lastName" required>
                                <div class="error-message">Please enter your last name</div>
                            </div>
                        </div>

                        <!-- Row 2: Email Address -->
                        <div class="form-group">
                            <label for="email">Email Address *</label>
                            <input type="email" id="email" name="email" required>
                            <div class="error-message">Please enter a valid email address</div>
                        </div>

                        <!-- Row 3: Country -->
                        <div class="form-group">
                            <label for="country">Country *</label>
                            <select id="country" name="country" required>
                                <option value="">Select Country</option>
                                <!-- Countries will be populated by JavaScript -->
                            </select>
                        </div>

                        <!-- Row 5: Current Role and Years of Experience -->
                        <div class="form-row">
                            <div class="form-group">
                                <label for="role">Current Role *</label>
                                <input type="text" id="role" name="role" placeholder="e.g., Software Engineer" required>
                            </div>
                            <div class="form-group">
                                <label for="experienceYears">Years of Experience *</label>
                                <select id="experienceYears" name="experienceYears" required>
                                    <option value="">Select...</option>
                                    <option value="Fresh Graduate">Fresh Graduate</option>
                                    <option value="1 year">1 year</option>
                                    <option value="2 years">2 years</option>
                                    <option value="3 years">3 years</option>
                                    <option value="4 years">4 years</option>
                                    <option value="5 years">5 years</option>
                                    <option value="6-10 years">6-10 years</option>
                                    <option value="10+ years">10+ years</option>
                                </select>
                            </div>
                        </div>

                        <!-- Row 6: Password -->
                        <div class="form-group">
                            <label for="password">Password *</label>
                            <input type="password" id="password" name="password" required>
                            <div class="password-requirements">
                                <span class="requirement" id="req-length">• At least 8 characters</span>
                                <span class="requirement" id="req-uppercase">• One uppercase letter</span>
                                <span class="requirement" id="req-lowercase">• One lowercase letter</span>
                                <span class="requirement" id="req-number">• One number</span>
                                <span class="requirement" id="req-special">• One special character (@$!%*?&-#^+=)</span>
                            </div>
                            <div class="error-message">Password doesn't meet requirements</div>
                        </div>

                        <!-- Row 7: Confirm Password -->
                        <div class="form-group">
                            <label for="confirmPassword">Confirm Password *</label>
                            <input type="password" id="confirmPassword" name="confirmPassword" required>
                            <div class="error-message">Passwords do not match</div>
                        </div>

                        <!-- Terms and Conditions Checkbox -->
                        <div class="form-group checkbox-group">
                            <div class="checkbox-wrapper">
                                <input type="checkbox" id="acceptTerms" name="acceptTerms" required>
                                <label for="acceptTerms" class="checkbox-label">
                                    I agree to the <a href="/terms" target="_blank">Terms of Service</a> and <a href="/privacy" target="_blank">Privacy Policy</a> *
                                </label>
                            </div>
                        </div>

                        <button type="submit" class="submit-btn" id="submitBtn">
                            Create Account
                        </button>
                    </form>

                    <div class="auth-footer">
                        <p>Already have an account? <a href="/login">Login here</a></p>
                    </div>
                </div>
            </div>
        `;
    }

    getStyles() {
        return `
        body {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%) !important;
            min-height: 100vh;
            color: #333 !important;
        }

        .auth-container {
            max-width: 500px;
            margin: 50px auto;
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
            margin-bottom: 40px;
        }

        .auth-container .auth-card .auth-header h1,
        .auth-header h1,
        h1 {
            color: #2d3748 !important;
            margin-bottom: 10px;
            font-size: 2em;
            font-weight: 700 !important;
            opacity: 1 !important;
            text-shadow: none !important;
            filter: none !important;
            -webkit-text-fill-color: #2d3748 !important;
            -webkit-text-stroke: none !important;
        }
        
        /* Force all text in auth container to be dark */
        .auth-container * {
            color: inherit !important;
        }
        
        .auth-container {
            color: #2d3748 !important;
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

        .form-group input,
        .form-group select {
            width: 100%;
            padding: 12px 15px;
            border: 2px solid rgba(226, 232, 240, 0.8);
            border-radius: 12px;
            font-size: 16px;
            transition: all 0.3s ease;
            box-sizing: border-box;
            background: rgba(255, 255, 255, 0.9);
        }

        .form-group input:focus,
        .form-group select:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            background: rgba(255, 255, 255, 1);
        }

        .form-group.error input,
        .form-group.error select {
            border-color: #e53e3e;
            box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.1);
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }

        .form-group select {
            appearance: none;
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
            background-position: right 12px center;
            background-repeat: no-repeat;
            background-size: 16px;
            padding-right: 40px;
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

        .checkbox-group.error .error-message {
            display: none !important;
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

        .password-requirements {
            font-size: 12px;
            color: #4a5568;
            margin-top: 8px;
            line-height: 1.4;
            padding: 8px 12px;
            background: rgba(248, 250, 252, 0.8);
            border-radius: 8px;
            border-left: none;
        }

        .requirement {
            display: block;
            color: #e53e3e;
            transition: color 0.3s;
            margin-bottom: 2px;
        }

        .requirement.valid {
            color: #27ae60;
        }

        .loading-spinner {
            display: none;
            margin: 0 auto 20px;
            text-align: center;
            padding: 20px;
        }

        .loading-spinner .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(243, 243, 243, 0.8);
            border-top: 4px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
        }

        .loading-text {
            color: #667eea;
            font-size: 16px;
            font-weight: 600;
            margin: 0;
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

        /* Checkbox styling */
        .checkbox-group {
            margin-bottom: 25px;
        }

        .checkbox-wrapper {
            display: flex;
            align-items: center;
            gap: 10px;
            justify-content: center;
        }

        .checkbox-wrapper input[type="checkbox"] {
            width: 16px;
            height: 16px;
            margin: 0;
            flex-shrink: 0;
            accent-color: #667eea;
            cursor: pointer;
        }

        .checkbox-label {
            cursor: pointer;
            font-size: 14px;
            color: #2d3748 !important;
            line-height: 1.2;
            margin: 0;
            display: inline-flex;
            align-items: center;
            position: relative;
            top: 5px;
        }

        .checkmark {
            display: none;
        }

        .checkbox-label input[type="checkbox"]:checked + .checkmark {
            background: #667eea;
            border-color: #667eea;
        }

        .checkbox-label input[type="checkbox"]:checked + .checkmark::after {
            content: '';
            position: absolute;
            left: 5px;
            top: 1px;
            width: 5px;
            height: 9px;
            border: solid white;
            border-width: 0 2px 2px 0;
            transform: rotate(45deg);
        }

        .checkbox-group.error input[type="checkbox"] {
            outline: 2px solid #e53e3e;
            outline-offset: 1px;
        }

        .checkbox-wrapper input[type="checkbox"]:focus {
            outline: 2px solid #667eea;
            outline-offset: 2px;
        }

        .checkbox-label a {
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
        }

        .checkbox-label a:hover {
            text-decoration: underline;
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
            margin: 30px 0 20px 0;
            text-align: center;
        }

        @media (max-width: 768px) {
            .auth-container {
                margin: 20px;
            }

            .auth-card {
                padding: 30px 20px;
            }

            .form-row {
                grid-template-columns: 1fr;
            }

            /* Better checkbox alignment on mobile */
            .checkbox-wrapper {
                gap: 8px;
            }

            .checkbox-wrapper input[type="checkbox"] {
                width: 18px;
                height: 18px;
            }

            .checkbox-label {
                font-size: 13px;
                line-height: 1.4;
            }
            
        }
        `;
    }

    // Inject styles into the head
    injectStyles() {
        // Remove existing styles if present
        const existingStyles = document.getElementById('signup-page-styles');
        if (existingStyles) {
            existingStyles.remove();
        }

        const styleElement = document.createElement('style');
        styleElement.id = 'signup-page-styles';
        styleElement.textContent = this.getStyles();
        document.head.appendChild(styleElement);
    }

    async init() {
        try {
            console.log('Initializing signup page...');
            
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
            this.form = document.getElementById('signupForm');
            this.submitBtn = document.getElementById('submitBtn');
            this.loadingSpinner = document.getElementById('loadingSpinner');
            this.successMessage = document.getElementById('successMessage');
            this.errorAlert = document.getElementById('errorAlert');

            // Pre-fill email from URL parameter
            const urlParams = new URLSearchParams(window.location.search);
            const emailParam = urlParams.get('email');
            if (emailParam) {
                const emailInput = document.getElementById('email');
                if (emailInput) emailInput.value = emailParam;
            }

            // Load countries for country dropdown
            await this.loadCountries();

            this.setupEventListeners();
            this.setupPasswordValidation();

            // Initialize Google Sign-In
            await this.initGoogleSignIn();

            console.log('Signup page initialized successfully');
        } catch (error) {
            console.error('Error in SignupPage init:', error);
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
            const googleClientId = await this.getGoogleClientId();
            
            if (googleClientId) {
                const googleAuth = new GoogleAuth();
                await googleAuth.init(googleClientId);
                googleAuth.renderButton('googleSignInButton', {
                    text: 'signup_with',
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

    setupEventListeners() {
        if (!this.form) return;

        this.form.addEventListener('submit', this.handleSubmit.bind(this));
        
        // Real-time validation
        const inputs = this.form.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('blur', this.validateField.bind(this));
            input.addEventListener('input', () => {
                this.clearFieldError(input);
            });
        });
    }

    setupPasswordValidation() {
        const passwordInput = document.getElementById('password');
        const confirmPasswordInput = document.getElementById('confirmPassword');

        if (passwordInput) {
            passwordInput.addEventListener('input', this.checkPasswordRequirements.bind(this));
        }
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', this.checkPasswordMatch.bind(this));
        }
    }

    checkPasswordRequirements() {
        const passwordInput = document.getElementById('password');
        if (!passwordInput) return false;

        const password = passwordInput.value;
        
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[@$!%*?&\-#^+=]/.test(password)
        };

        Object.keys(requirements).forEach(req => {
            const element = document.getElementById(`req-${req}`);
            if (element) {
                if (requirements[req]) {
                    element.classList.add('valid');
                } else {
                    element.classList.remove('valid');
                }
            }
        });

        return Object.values(requirements).every(req => req);
    }

    checkPasswordMatch() {
        const passwordInput = document.getElementById('password');
        const confirmPasswordInput = document.getElementById('confirmPassword');
        
        if (!passwordInput || !confirmPasswordInput) return false;

        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const confirmGroup = confirmPasswordInput.closest('.form-group');

        if (confirmPassword && password !== confirmPassword) {
            this.showFieldError(confirmGroup, 'Passwords do not match');
            return false;
        } else {
            this.clearFieldError(confirmPasswordInput);
            return true;
        }
    }

    validateField(event) {
        const field = event.target;
        const value = field.type === 'checkbox' ? field.checked : field.value.trim();
        const fieldGroup = field.closest('.form-group');

        switch (field.type) {
            case 'email':
                if (value && !this.isValidEmail(value)) {
                    this.showFieldError(fieldGroup, 'Please enter a valid email address');
                    return false;
                }
                break;
            case 'password':
                if (field.name === 'password' && value && !this.checkPasswordRequirements()) {
                    this.showFieldError(fieldGroup, 'Password doesn\'t meet requirements');
                    return false;
                }
                if (field.name === 'confirmPassword' && !this.checkPasswordMatch()) {
                    return false;
                }
                break;
            case 'checkbox':
                if (field.name === 'acceptTerms' && !field.checked) {
                    fieldGroup.classList.add('error');
                    return false;
                }
                break;
        }

        // Check required fields
        if (field.required) {
            if (field.type === 'checkbox' && !field.checked) {
                fieldGroup.classList.add('error');
                return false;
            } else if (field.type !== 'checkbox' && !value) {
                const label = fieldGroup.querySelector('label');
                const fieldName = label ? label.textContent.replace(' *', '') : 'This field';
                this.showFieldError(fieldGroup, `${fieldName} is required`);
                return false;
            }
        }

        this.clearFieldError(field);
        return true;
    }

    showFieldError(fieldGroup, message) {
        if (!fieldGroup) return;
        fieldGroup.classList.add('error');
        const errorElement = fieldGroup.querySelector('.error-message');
        if (errorElement) {
            errorElement.textContent = message;
        }
    }

    clearFieldError(field) {
        if (!field) return;
        const fieldGroup = field.closest('.form-group');
        if (fieldGroup) {
            fieldGroup.classList.remove('error');
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showAlert(message, type = 'error') {
        this.hideAlerts();
        
        if (type === 'success') {
            if (this.successMessage) {
                this.successMessage.textContent = message;
                this.successMessage.style.display = 'block';
            }
        } else {
            if (this.errorAlert) {
                this.errorAlert.textContent = message;
                this.errorAlert.style.display = 'block';
            }
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

    async loadCountries() {
        try {
            const response = await fetch('https://restcountries.com/v3.1/all?fields=name,flag');
            const countries = await response.json();
            
            const countrySelect = document.getElementById('country');
            if (!countrySelect) return;
            
            // Process and sort countries
            const countryData = countries
                .map(country => ({
                    name: country.name.common,
                    flag: country.flag
                }))
                .sort((a, b) => a.name.localeCompare(b.name));
            
            // Add options to select
            countryData.forEach(country => {
                const option = document.createElement('option');
                option.value = country.name;
                option.textContent = `${country.flag} ${country.name}`;
                countrySelect.appendChild(option);
            });
            
        } catch (error) {
            console.error('Failed to load countries:', error);
            // Fallback to a few default countries
            const countrySelect = document.getElementById('country');
            if (!countrySelect) return;
            
            const fallbackCountries = [
                '🇺🇸 United States',
                '🇬🇧 United Kingdom',
                '🇨🇦 Canada',
                '🇦🇺 Australia',
                '🇫🇷 France',
                '🇩🇪 Germany',
                '🇮🇹 Italy'
            ];
            
            fallbackCountries.forEach(countryText => {
                const option = document.createElement('option');
                const countryName = countryText.split(' ').slice(1).join(' ');
                option.value = countryName;
                option.textContent = countryText;
                countrySelect.appendChild(option);
            });
        }
    }

    async handleSubmit(event) {
        event.preventDefault();
        this.hideAlerts();

        // Validate all fields
        const inputs = this.form.querySelectorAll('input[required], select[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!this.validateField({ target: input })) {
                isValid = false;
            }
        });

        // Check password requirements and match
        if (!this.checkPasswordRequirements()) {
            isValid = false;
        }
        if (!this.checkPasswordMatch()) {
            isValid = false;
        }

        if (!isValid) {
            this.showAlert('Please fix the errors above before submitting.');
            return;
        }

        // Show loading
        this.submitBtn.disabled = true;
        this.submitBtn.textContent = 'Creating Account...';
        this.loadingSpinner.style.display = 'block';
        this.loadingSpinner.innerHTML = '<div class="spinner"></div><p class="loading-text">Creating your account...</p>';

        try {
            const formData = new FormData(this.form);
            const firstName = formData.get('firstName');
            const lastName = formData.get('lastName');
            const fullName = `${firstName} ${lastName}`.trim();
            
            const userData = {
                name: fullName,
                email: formData.get('email'),
                password: formData.get('password'),
                country: formData.get('country') || null,
                role: formData.get('role') || null,
                experienceYears: formData.get('experienceYears') || null,
                guestId: localStorage.getItem('guestId') || null
            };


            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const result = await response.json();

            if (response.ok) {
                // Track signup with Reddit Pixel
                if (window.redditTracking) {
                    window.redditTracking.trackSignUp(result.user);
                }

                // Track signup with Google Ads, then redirect
                const email = userData.email;
                const redirectUrl = `/check-email?email=${encodeURIComponent(email)}`;

                if (typeof gtag !== 'undefined') {
                    gtag('event', 'conversion', {
                        'send_to': 'AW-958968799/EP6tCPaY850cEN_noskD',
                        'event_callback': function() {
                            window.location.href = redirectUrl;
                        }
                    });
                    // Fallback redirect in case callback never fires
                    setTimeout(() => { window.location.href = redirectUrl; }, 1500);
                } else {
                    window.location.href = redirectUrl;
                }
            } else {
                throw new Error(result.error || 'Registration failed');
            }

        } catch (error) {
            console.error('Signup error:', error);
            this.showAlert(error.message || 'Registration failed. Please try again.');
        } finally {
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = 'Create Account';
            this.loadingSpinner.style.display = 'none';
            this.loadingSpinner.innerHTML = '';
        }
    }

    // Clean up when navigating away from this page
    cleanup() {
        // Remove page-specific styles
        const styles = document.getElementById('signup-page-styles');
        if (styles) {
            styles.remove();
        }
        
        // Remove event listeners if needed
        if (this.form) {
            this.form.removeEventListener('submit', this.handleSubmit);
        }
        }
    }; // End of SignupPage class

    console.log('SignupPage class declared successfully');
} // End of if statement

// Export for use in router
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.SignupPage;
}
