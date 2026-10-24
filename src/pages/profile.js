class ProfilePage {
    constructor() {
        this.userData = null;
    }

    async init(container) {
        console.log('ProfilePage init called with container:', container);
        
        try {
            // Check authentication first
            if (typeof authManager !== 'undefined' && !authManager.isAuthenticated()) {
                console.log('User not authenticated, redirecting to login');
                window.location.href = '/login?redirect=profile';
                return;
            }

            // Set the HTML content - find or create content area, preserving navigation
            console.log('Setting HTML content...');
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
            
            console.log('HTML content set, container children:', container.children.length);
            
            // Setup event handlers
            this.setupEventHandlers();
            
            // Load profile data
            await this.loadProfile();
            
            // Load subscription status
            await this.loadSubscriptionStatus();
            
            console.log('ProfilePage initialization complete');
        } catch (error) {
            console.error('Error in ProfilePage init:', error);
        }
    }

    // Get the CSS styles for this page (copied exactly from profile.html)
    getStyles() {
        return `
            * {
                box-sizing: border-box;
            }

            body {
                margin: 0;
                padding: 0;
            }

            .page-content {
                width: 100%;
            }

            .profile-container {
                max-width: 1100px;
                margin: 20px auto 40px;
                padding: 0 10px;
                width: 100%;
            }

            .profile-card {
                background: white;
                padding: 48px;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                width: 100%;
                max-width: 100%;
            }

            .profile-header {
                text-align: center;
                margin-bottom: 40px;
                padding-bottom: 30px;
                border-bottom: 2px solid #e2e8f0;
            }

            .profile-avatar {
                width: 120px;
                height: 120px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
                font-size: 48px;
                color: white;
                font-weight: 600;
            }

            .profile-name {
                font-size: 2em;
                font-weight: 600;
                color: #333;
                margin-bottom: 5px;
            }

            .profile-email {
                color: #666;
                font-size: 1.1em;
            }

            .profile-section {
                margin-bottom: 30px;
            }

            .profile-container .profile-card .profile-section .section-title,
            .profile-container .profile-section h2.section-title,
            .profile-container h2.section-title,
            .profile-container .section-title {
                color: #374151 !important;
                background: none !important;
                -webkit-background-clip: unset !important;
                -webkit-text-fill-color: #374151 !important;
                background-clip: unset !important;
                font-size: 1.2em !important;
                font-weight: 600 !important;
                margin-bottom: 20px !important;
                display: flex !important;
                align-items: center !important;
                gap: 10px !important;
            }
            
            .profile-container h2 {
                color: #374151 !important;
                background: none !important;
                -webkit-background-clip: unset !important;
                -webkit-text-fill-color: #374151 !important;
                background-clip: unset !important;
            }

            .section-title::before {
                content: '';
                width: 4px;
                height: 20px;
                background: #667eea;
                border-radius: 2px;
            }

            .profile-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 40px;
                max-width: 1000px;
                margin: 0 auto;
                justify-content: center;
            }

            .profile-field {
                background: #f7fafc;
                padding: 35px;
                border-radius: 8px;
                border: 1px solid #e2e8f0;
                transition: all 0.3s;
                overflow: hidden;
                box-sizing: border-box;
                min-width: 320px;
            }

            .profile-field:hover {
                border-color: #667eea;
                background: #f3f4f6;
            }

            .field-label {
                font-size: 0.9em;
                color: #718096;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 5px;
            }

            .field-value {
                font-size: 1.1em;
                color: #2d3748;
                font-weight: 500;
                word-wrap: break-word;
                overflow-wrap: break-word;
                max-width: 100%;
            }

            .field-value.empty {
                color: #a0aec0;
                font-style: italic;
            }

            .edit-btn {
                background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%);
                color: white;
                padding: 12px 30px;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }

            .edit-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
            }

            .edit-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            .action-buttons {
                display: flex;
                gap: 15px;
                justify-content: center;
                margin-top: 30px;
                padding-top: 30px;
                border-top: 2px solid #e2e8f0;
            }

            .secondary-btn {
                background: white;
                color: #667eea;
                padding: 12px 30px;
                border: 2px solid #667eea;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
            }

            .secondary-btn:hover {
                background: #667eea;
                color: white;
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
            }

            .loading-spinner {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 400px;
            }

            .spinner {
                width: 50px;
                height: 50px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #667eea;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .error-message {
                background: #f8d7da;
                color: #721c24;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: center;
            }

            .success-message {
                background: #d4edda;
                color: #155724;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: center;
            }

            .member-since {
                text-align: center;
                color: #718096;
                font-size: 0.9em;
                margin-top: 10px;
            }

            @media (max-width: 768px) {
                .profile-container {
                    margin: 8px auto 20px;
                    padding: 0 6px;
                }

                .profile-card {
                    padding: 22px 12px !important;
                }

                .profile-card .profile-section {
                    padding: 0;
                }

                .profile-grid {
                    grid-template-columns: 1fr;
                    width: 100%;
                    max-width: 100%;
                    margin: 0;
                    justify-content: stretch;
                    gap: 20px;
                }

                .subscription-card {
                    min-width: 0;
                    width: 100%;
                }

                .profile-field {
                    min-width: 0;
                    width: 100%;
                    padding: 24px;
                }

                .action-buttons {
                    flex-direction: column;
                }

                .edit-btn, .secondary-btn {
                    width: 100%;
                }
            }

            /* Subscription Card Styles - mimic profile-field */
            .subscription-card {
                background: #f8fafc;
                padding: 35px;
                border-radius: 8px;
                border: 1px solid #e2e8f0;
                transition: all 0.3s;
                overflow: hidden;
                box-sizing: border-box;
                min-width: 0;
                margin: 0;
                width: 100%;
                grid-column: 1 / -1;
            }

            .subscription-header {
                margin-bottom: 20px;
                text-align: center;
            }

            @media (max-width: 768px) {
                .subscription-card {
                    width: 100% !important;
                }
            }

            .subscription-badge {
                display: inline-block;
                padding: 6px 16px;
                border-radius: 20px;
                font-size: 0.9rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .subscription-badge.active {
                background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
                color: white;
                box-shadow: 0 4px 12px rgba(72, 187, 120, 0.3);
            }

            .subscription-badge.inactive {
                background: linear-gradient(135deg, #fc8181 0%, #f56565 100%);
                color: white;
                box-shadow: 0 4px 12px rgba(252, 129, 129, 0.3);
            }

            .subscription-details {
                display: grid;
                grid-template-columns: 1fr;
                gap: 20px;
                width: 100% !important;
            }

            .subscription-stat {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 30px !important;
                background: white;
                border-radius: 8px;
                border: 1px solid #e2e8f0;
                width: 100% !important;
                box-sizing: border-box !important;
            }

            .subscription-stat .label {
                color: #64748b;
                font-weight: 500;
                font-size: 0.95rem;
            }

            .subscription-stat .value {
                color: #1e293b;
                font-weight: 600;
                font-size: 1rem;
            }

            .subscription-stat .value.questions-remaining {
                color: #f59e0b;
                font-weight: 700;
            }

            /* Warning styles */
            .subscription-warning {
                display: flex;
                align-items: center;
                gap: 12px;
                margin: 15px 0;
                padding: 15px;
                background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%);
                border: 1px solid rgba(251, 191, 36, 0.3);
                border-radius: 10px;
            }

            .subscription-warning .warning-icon {
                font-size: 1.5rem;
                flex-shrink: 0;
            }

            .subscription-warning .warning-text {
                color: #d97706;
                font-weight: 600;
                font-size: 0.95rem;
                line-height: 1.4;
            }

            .subscription-stat .value.warning {
                color: #dc2626 !important;
                font-weight: 700 !important;
            }

            /* Subscription actions */
            .subscription-actions {
                margin-top: 20px;
                text-align: center;
            }

            .extend-btn {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 0.95rem;
            }

            .extend-btn:hover {
                background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(217, 119, 6, 0.3);
            }

            /* Playful theme overrides */
            @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');

            :root {
                --brand: #0ea5e9;
                --brand-dark: #0284c7;
                --ink: #1f2937;
                --muted: #64748b;
                --panel: #ffffff;
                --border: rgba(226, 232, 240, 0.8);
                --shadow: 0 16px 30px rgba(15, 23, 42, 0.08);
            }

            body {
                background:
                    radial-gradient(900px 520px at 12% -15%, #fef9c3 0%, rgba(254, 249, 195, 0) 55%),
                    radial-gradient(900px 520px at 92% -5%, #bae6fd 0%, rgba(186, 230, 253, 0) 55%),
                    linear-gradient(180deg, #f0fdf4 0%, #ecfeff 100%);
                font-family: "Nunito", "Segoe UI", sans-serif;
                color: var(--ink);
            }

            .profile-card {
                border-radius: 28px;
                border: 1px solid var(--border);
                box-shadow: var(--shadow);
            }

            .profile-header {
                background: linear-gradient(135deg, #e0f2fe 0%, #fef9c3 55%, #dcfce7 100%);
                border-radius: 24px;
                padding: 26px;
                margin-bottom: 32px;
                text-align: center;
                border: 1px solid rgba(255, 255, 255, 0.9);
                box-shadow: 0 16px 30px rgba(15, 23, 42, 0.12);
            }

            .profile-name {
                color: var(--ink);
                font-weight: 800;
            }

            .profile-email,
            .member-since {
                color: var(--muted);
            }

            .section-title::before {
                background: #7dd3fc;
            }

            .profile-field {
                background: #ffffff;
                border-radius: 20px;
                border: 1px solid var(--border);
                box-shadow: 0 12px 22px rgba(15, 23, 42, 0.06);
            }

            .profile-field:hover {
                border-color: rgba(125, 211, 252, 0.8);
                background: #f8fafc;
            }

            .field-label {
                color: var(--muted);
                font-weight: 700;
            }

            .field-value {
                color: var(--ink);
                font-weight: 600;
            }

            .edit-btn {
                background: linear-gradient(135deg, #7dd3fc 0%, #86efac 100%);
                color: #0f172a;
                border-radius: 999px;
                box-shadow: 0 12px 20px rgba(56, 189, 248, 0.25);
            }

            .edit-btn:hover {
                box-shadow: 0 18px 28px rgba(56, 189, 248, 0.35);
            }

            .secondary-btn {
                border-radius: 999px;
                border: 1px solid rgba(186, 230, 253, 0.9);
                color: var(--brand);
            }

            .secondary-btn:hover {
                background: #ecfeff;
                color: var(--brand-dark);
                box-shadow: 0 10px 20px rgba(56, 189, 248, 0.2);
            }

            .subscription-card {
                background: #ffffff;
                border-radius: 24px;
                border: 1px solid var(--border);
                box-shadow: var(--shadow);
            }

            .subscription-badge.active {
                background: linear-gradient(135deg, #7dd3fc 0%, #86efac 100%);
                color: #0f172a;
                box-shadow: 0 6px 16px rgba(56, 189, 248, 0.25);
            }

            .subscription-badge.inactive {
                background: linear-gradient(135deg, #fecaca 0%, #fdba74 100%);
                color: #7c2d12;
                box-shadow: 0 6px 16px rgba(253, 186, 116, 0.25);
            }

            .subscription-stat {
                background: #f8fafc;
                border-radius: 14px;
                border: 1px solid var(--border);
            }

            .subscription-stat .label {
                color: var(--muted);
                font-weight: 600;
            }

            .subscription-stat .value {
                color: var(--ink);
                font-weight: 700;
            }

            .subscription-stat .value.questions-remaining {
                color: #f59e0b;
            }

            .subscription-warning {
                background: rgba(254, 243, 199, 0.6);
                border: 1px solid rgba(253, 230, 138, 0.7);
                border-radius: 14px;
            }

            .extend-btn {
                background: linear-gradient(135deg, #7dd3fc 0%, #86efac 100%);
                color: #0f172a;
                border-radius: 999px;
            }

            .extend-btn:hover {
                background: linear-gradient(135deg, #7dd3fc 0%, #5eead4 100%);
                box-shadow: 0 10px 20px rgba(56, 189, 248, 0.25);
            }
        `;
    }

    getHTML() {
        return `
            <style>${this.getStyles()}</style>
            
            <div class="profile-container">
                <div id="loadingState" class="loading-spinner">
                    <div class="spinner"></div>
                </div>

                <div id="profileContent" class="profile-card" style="display: none;">
                    <div class="profile-header">
                        <h1 class="profile-name" id="profileName">Loading...</h1>
                        <p class="profile-email" id="profileEmail">Loading...</p>
                        <p class="member-since" id="memberSince">Member since: Loading...</p>
                    </div>

                    <div id="alertMessage"></div>

                    <div class="profile-section">
                        <div class="profile-grid">
                            <div class="profile-field">
                                <div class="field-label">First Name</div>
                                <div class="field-value" id="firstName">-</div>
                            </div>
                            <div class="profile-field">
                                <div class="field-label">Last Name</div>
                                <div class="field-value" id="lastName">-</div>
                            </div>
                            <div class="profile-field">
                                <div class="field-label">Email Address</div>
                                <div class="field-value" id="email">-</div>
                            </div>
                            <div class="profile-field">
                                <div class="field-label">Current Role</div>
                                <div class="field-value" id="role">-</div>
                            </div>
                            <div class="profile-field">
                                <div class="field-label">Years of Experience</div>
                                <div class="field-value" id="experienceYears">-</div>
                            </div>
                            <div class="profile-field">
                                <div class="field-label">Resume File</div>
                                <div class="field-value" id="resumeFilename">No resume uploaded</div>
                                <div id="resumeUploadedAt" style="font-size: 0.85em; color: #718096; margin-top: 5px;"></div>
                            </div>
                        </div>
                    </div>

                    <div class="profile-section">
                        <h2 class="section-title" style="color: #374151 !important; -webkit-text-fill-color: #374151 !important; background: none !important; -webkit-background-clip: unset !important;">Your Subscription</h2>
                        <div class="profile-grid">
                            <div id="subscriptionStatus" class="subscription-card">
                                <div class="subscription-header">
                                    <span class="subscription-badge" id="subscriptionBadge">Loading...</span>
                                </div>
                                <div id="subscriptionWarning" class="subscription-warning" style="display: none;">
                                    <div class="warning-icon">⚠️</div>
                                    <div class="warning-text" id="warningText"></div>
                                </div>
                                <div class="subscription-details">
                                    <div class="subscription-stat">
                                        <span class="label">Questions Remaining:</span>
                                        <span class="value" id="questionsRemaining">-</span>
                                    </div>
                                    <div class="subscription-stat">
                                        <span class="label">Valid Until:</span>
                                        <span class="value" id="validUntil">-</span>
                                    </div>
                                </div>
                                <div id="subscriptionActions" class="subscription-actions" style="display: none;">
                                    <button class="extend-btn" id="extendBtn" onclick="window.location.href='/pricing'">Extend Subscription</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="action-buttons">
                        <button class="edit-btn" id="editProfileBtn">
                            Edit Profile
                        </button>
                        <button class="secondary-btn" id="dashboardBtn">
                            View Dashboard
                        </button>
                        <button class="secondary-btn" id="changePasswordBtn">
                            Change Password
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventHandlers() {
        document.addEventListener('click', (e) => {
            if (e.target.id === 'editProfileBtn') {
                this.handleEditProfile();
            } else if (e.target.id === 'dashboardBtn') {
                this.handleViewDashboard();
            } else if (e.target.id === 'changePasswordBtn') {
                this.handleChangePassword();
            }
        });
    }

    async loadProfile() {
        try {
            const response = await authManager.apiRequest('/api/auth/profile');
            
            if (!response.ok) {
                throw new Error('Failed to load profile');
            }

            const data = await response.json();
            this.displayProfile(data.user);

        } catch (error) {
            console.error('Error loading profile:', error);
            this.showAlert('Failed to load profile information', 'error');
        } finally {
            const loadingState = document.getElementById('loadingState');
            const profileContent = document.getElementById('profileContent');
            if (loadingState) loadingState.style.display = 'none';
            if (profileContent) profileContent.style.display = 'block';
        }
    }

    displayProfile(user) {
        // Store user data for later use
        this.userData = user;
        
        // Parse name
        const nameParts = (user.name || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Clear avatar text (no initials)
        const profileAvatar = document.getElementById('profileAvatar');
        if (profileAvatar) profileAvatar.textContent = '';

        // Set header info
        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');
        if (profileName) profileName.textContent = user.name || 'No name set';
        if (profileEmail) profileEmail.textContent = user.email;
        
        // Format member since date
        const memberSince = new Date(user.created_at);
        const memberSinceElement = document.getElementById('memberSince');
        if (memberSinceElement) {
            memberSinceElement.textContent = 
                `Member since: ${memberSince.toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric' 
                })}`;
        }

        // Set personal information
        this.setFieldValue('firstName', firstName);
        this.setFieldValue('lastName', lastName);
        this.setFieldValue('email', user.email);

        // Set location
        // Set professional information
        this.setFieldValue('role', user.role);
        this.setFieldValue('experienceYears', user.experience_years);

        // Set resume information
        this.displayResume(user);
    }

    setFieldValue(fieldId, value) {
        const element = document.getElementById(fieldId);
        if (element) {
            if (value && value !== '') {
                element.textContent = value;
                element.classList.remove('empty');
            } else {
                element.textContent = 'Not provided';
                element.classList.add('empty');
            }
        }
    }

    getInitials(name) {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return parts[0][0].toUpperCase() + parts[parts.length - 1][0].toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    formatExperience(years) {
        if (years === null || years === undefined) return null;
        if (years === 0) return 'Fresh Graduate';
        if (years === 1) return '1 year';
        if (years >= 6 && years < 10) return '6-10 years';
        if (years >= 10) return '10+ years';
        return `${years} years`;
    }

    formatDate(dateString) {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays < 7) return `${diffDays} days ago`;
        
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    displayResume(user) {
        const resumeFilename = document.getElementById('resumeFilename');
        const resumeUploadedAt = document.getElementById('resumeUploadedAt');
        
        if (user.resume_filename && user.resume_content) {
            if (resumeFilename) {
                resumeFilename.textContent = user.resume_filename;
                resumeFilename.classList.remove('empty');
            }
            
            if (user.resume_uploaded_at && resumeUploadedAt) {
                const uploadDate = new Date(user.resume_uploaded_at);
                resumeUploadedAt.textContent = `Uploaded ${this.formatDate(user.resume_uploaded_at)}`;
            }
        } else {
            if (resumeFilename) {
                resumeFilename.textContent = 'No resume uploaded';
                resumeFilename.classList.add('empty');
            }
            if (resumeUploadedAt) {
                resumeUploadedAt.textContent = '';
            }
        }
    }

    showAlert(message, type = 'error') {
        const alertMessage = document.getElementById('alertMessage');
        if (alertMessage) {
            const alertClass = type === 'success' ? 'success-message' : 'error-message';
            alertMessage.innerHTML = `<div class="${alertClass}">${message}</div>`;
            
            setTimeout(() => {
                alertMessage.innerHTML = '';
            }, 5000);
        }
    }

    async loadSubscriptionStatus() {
        try {
            const token = localStorage.getItem('authToken');
            
            const response = await fetch('/api/subscription/status', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                console.error('Failed to load subscription status');
                return;
            }
            
            const data = await response.json();
            
            if (data.hasActiveSubscription && data.subscription) {
                // Calculate warnings
                const questionsRemaining = data.subscription.questions_remaining;
                const expiryDate = new Date(data.subscription.expiry_date);
                const today = new Date();
                const daysRemaining = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
                
                const lowQuestions = questionsRemaining <= 10;
                const expiringSoon = daysRemaining <= 7;
                const showWarning = lowQuestions || expiringSoon;
                
                // Update subscription details - active
                document.getElementById('subscriptionBadge').textContent = 'Active';
                document.getElementById('subscriptionBadge').className = 'subscription-badge active';
                
                // Show/hide warning section
                const warningSection = document.getElementById('subscriptionWarning');
                const warningText = document.getElementById('warningText');
                const actionsSection = document.getElementById('subscriptionActions');
                
                if (showWarning) {
                    let warningMessage = '';
                    if (lowQuestions) {
                        warningMessage += `Only ${questionsRemaining} questions remaining!`;
                    }
                    if (lowQuestions && expiringSoon) {
                        warningMessage += '<br>';
                    }
                    if (expiringSoon) {
                        warningMessage += `Expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}!`;
                    }

                    warningText.innerHTML = warningMessage;
                    warningSection.style.display = 'flex';
                    actionsSection.style.display = 'block';

                    // A trial user has never actually had a paid subscription, so
                    // "Extend Subscription" doesn't make sense for them yet.
                    const isTrial = (data.subscription.subscriptions || []).some(s => s.package_id === 3);
                    document.getElementById('extendBtn').textContent = isTrial ? 'Get Started' : 'Extend Subscription';
                } else {
                    warningSection.style.display = 'none';
                    actionsSection.style.display = 'none';
                }
                
                // Set questions remaining with warning highlight if needed
                const questionsElement = document.getElementById('questionsRemaining');
                questionsElement.textContent = data.subscription.questions_remaining || '0';
                questionsElement.className = `value questions-remaining${lowQuestions ? ' warning' : ''}`;
                
                // Set valid until with warning highlight if needed
                const validUntilElement = document.getElementById('validUntil');
                validUntilElement.textContent = expiryDate.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });
                validUntilElement.className = `value${expiringSoon ? ' warning' : ''}`;
            } else {
                // Update subscription details - inactive
                document.getElementById('subscriptionBadge').textContent = 'Inactive';
                document.getElementById('subscriptionBadge').className = 'subscription-badge inactive';
                document.getElementById('questionsRemaining').textContent = '0';
                document.getElementById('validUntil').textContent = '-';
                
                // Hide warning and actions for inactive subscriptions
                document.getElementById('subscriptionWarning').style.display = 'none';
                document.getElementById('subscriptionActions').style.display = 'none';
            }
        } catch (error) {
            console.error('Error loading subscription status:', error);
            // Set fallback values
            document.getElementById('subscriptionBadge').textContent = 'Error';
            document.getElementById('questionsRemaining').textContent = '-';
            document.getElementById('validUntil').textContent = '-';
        }
    }

    // Event handlers
    handleEditProfile() {
        // Navigate to edit profile page
        router.navigate('/edit-profile');
    }

    handleViewDashboard() {
        // Navigate to dashboard page
        router.navigate('/dashboard');
    }

    handleChangePassword() {
        // For now, show an alert - can be expanded later
        alert('Change password functionality coming soon!');
    }
}

// Export for use in router
window.ProfilePage = ProfilePage;
