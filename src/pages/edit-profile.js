class EditProfilePage {
    constructor() {
        this.resumeFile = null;
        this.currentUserData = null;
    }

    async init(container) {
        console.log('EditProfilePage init called with container:', container);
        
        try {
            // Check authentication first
            if (typeof authManager !== 'undefined' && !authManager.isAuthenticated()) {
                console.log('User not authenticated, redirecting to login');
                window.location.href = '/login?redirect=edit-profile';
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
            
            // Initialize DOM references after HTML is set
            this.form = document.getElementById('editProfileForm');
            this.saveBtn = document.getElementById('saveBtn');
            this.loadingSpinner = document.getElementById('loadingSpinner');
            this.successMessage = document.getElementById('successMessage');
            this.errorAlert = document.getElementById('errorAlert');
            
            // Setup functionality
            await this.loadProfile();
            this.setupEventHandlers();
            
            console.log('EditProfilePage initialization complete');
        } catch (error) {
            console.error('Error in EditProfilePage init:', error);
        }
    }

    // Get the CSS styles for this page (copied exactly from edit-profile.html)
    getStyles() {
        return `
            .edit-container {
                max-width: 800px;
                margin: 50px auto;
                padding: 20px;
            }

            .edit-card {
                background: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            }

            .edit-header {
                text-align: center;
                margin-bottom: 40px;
                padding-bottom: 30px;
                border-bottom: 2px solid #e2e8f0;
            }

            .edit-header h1 {
                color: #333;
                margin-bottom: 10px;
            }

            .form-section {
                margin-bottom: 30px;
            }

            .section-title {
                font-size: 1.2em;
                font-weight: 600;
                color: #667eea;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .section-title::before {
                content: '';
                width: 4px;
                height: 20px;
                background: #667eea;
                border-radius: 2px;
            }

            .form-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
            }

            .form-group {
                margin-bottom: 20px;
            }

            .form-group label {
                display: block;
                margin-bottom: 5px;
                font-weight: 600;
                color: #333;
            }

            .form-group input,
            .form-group select {
                width: 100%;
                padding: 12px 15px;
                border: 2px solid #e2e8f0;
                border-radius: 8px;
                font-size: 16px;
                transition: border-color 0.3s;
                box-sizing: border-box;
            }

            .form-group input:focus,
            .form-group select:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }

            .form-group input:disabled {
                background: #f7fafc;
                color: #718096;
                cursor: not-allowed;
            }

            .form-group.error input,
            .form-group.error select {
                border-color: #e53e3e;
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

            .action-buttons {
                display: flex;
                gap: 15px;
                justify-content: center;
                margin-top: 30px;
                padding-top: 30px;
                border-top: 2px solid #e2e8f0;
            }

            .save-btn {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

            .save-btn:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
            }

            .save-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            .cancel-btn {
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

            .cancel-btn:hover {
                background: #667eea;
                color: white;
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
            }

            .secondary-btn {
                background: white;
                color: #667eea;
                padding: 8px 16px;
                border: 2px solid #667eea;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s;
            }

            .secondary-btn:hover {
                background: #667eea;
                color: white;
            }

            .loading-spinner {
                display: none;
                margin: 0 auto 20px;
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #667eea;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .success-message {
                background: #d4edda;
                color: #155724;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
                display: none;
            }

            .error-alert {
                background: #f8d7da;
                color: #721c24;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
                display: none;
            }

            .info-message {
                background: #e7f3ff;
                color: #004085;
                padding: 12px;
                border-radius: 8px;
                margin-top: 10px;
                font-size: 14px;
            }

            @media (max-width: 768px) {
                .edit-container {
                    margin: 20px;
                }

                .edit-card {
                    padding: 30px 20px;
                }

                .form-grid {
                    grid-template-columns: 1fr;
                }

                .action-buttons {
                    flex-direction: column;
                }

                .save-btn, .cancel-btn {
                    width: 100%;
                }
            }

            /* Playful theme overrides */
            @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');

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
                font-family: "Nunito", "Segoe UI", sans-serif;
                color: var(--ink);
            }

            .edit-container {
                max-width: 900px;
                margin: 32px auto 50px;
                padding: 0 20px;
            }

            .edit-card {
                border-radius: 26px;
                border: 1px solid rgba(226, 232, 240, 0.7);
                box-shadow: var(--shadow);
                padding: 36px 32px;
            }

            .edit-header {
                background: linear-gradient(135deg, #e0f2fe 0%, #fef9c3 55%, #dcfce7 100%);
                border-radius: 22px;
                padding: 26px;
                border: 1px solid rgba(255, 255, 255, 0.9);
                box-shadow: 0 14px 26px rgba(15, 23, 42, 0.12);
                margin-bottom: 28px;
            }

            .edit-header h1 {
                color: var(--ink);
                font-weight: 800;
            }

            .edit-header p {
                color: var(--muted);
            }

            .section-title {
                color: var(--ink);
            }

            .section-title::before {
                background: #7dd3fc;
            }

            .form-group label {
                color: var(--ink);
            }

            .form-group input,
            .form-group select {
                border-radius: 16px;
                border: 1px solid rgba(226, 232, 240, 0.8);
                background: #ffffff;
            }

            .form-group input:focus,
            .form-group select:focus {
                border-color: rgba(125, 211, 252, 0.9);
                box-shadow: 0 0 0 3px rgba(125, 211, 252, 0.25);
            }

            .action-buttons {
                border-top: 1px solid rgba(226, 232, 240, 0.7);
            }

            .save-btn {
                background: linear-gradient(135deg, #7dd3fc 0%, #86efac 100%);
                color: #0f172a;
                border-radius: 999px;
                box-shadow: 0 12px 20px rgba(56, 189, 248, 0.25);
            }

            .save-btn:hover:not(:disabled) {
                box-shadow: 0 18px 28px rgba(56, 189, 248, 0.35);
            }

            .cancel-btn,
            .secondary-btn {
                border-radius: 999px;
                border: 1px solid rgba(125, 211, 252, 0.8);
                color: #0ea5e9;
            }

            .cancel-btn:hover,
            .secondary-btn:hover {
                background: #e0f2fe;
                color: #0284c7;
                box-shadow: 0 10px 20px rgba(56, 189, 248, 0.2);
            }

            .loading-spinner {
                border-top-color: #7dd3fc;
            }

            .success-message {
                background: rgba(134, 239, 172, 0.35);
                color: #14532d;
                border: 1px solid rgba(134, 239, 172, 0.6);
            }

            .error-alert {
                background: rgba(254, 226, 226, 0.8);
                color: #7f1d1d;
                border: 1px solid rgba(252, 165, 165, 0.8);
            }

            .info-message {
                background: rgba(186, 230, 253, 0.35);
                color: #0c4a6e;
                border: 1px solid rgba(125, 211, 252, 0.5);
                border-radius: 12px;
            }
        `;
    }

    getHTML() {
        return `
            <style>${this.getStyles()}</style>
            
            <div class="edit-container">
                <div class="edit-card">
                    <div class="edit-header">
                        <h1>Edit Profile</h1>
                        <p>Update your personal and professional information</p>
                    </div>

                    <div class="loading-spinner" id="loadingSpinner"></div>
                    
                    <div class="success-message" id="successMessage">Profile updated successfully!</div>
                    <div class="error-alert" id="errorAlert"></div>

                    <form id="editProfileForm">
                        <div class="form-section">
                            <h2 class="section-title">Personal Information</h2>
                            <div class="form-grid">
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
                                <div class="form-group">
                                    <label for="email">Email Address</label>
                                    <input type="email" id="email" name="email" disabled>
                                    <div class="info-message">Email cannot be changed</div>
                                </div>
                            </div>
                        </div>

                        <div class="form-section">
                            <h2 class="section-title">Professional Information</h2>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="role">Current Role *</label>
                                    <input type="text" id="role" name="role" placeholder="e.g., Software Engineer" required>
                                    <div class="error-message">Please enter your current role</div>
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
                                    <div class="error-message">Please select your experience</div>
                                </div>
                            </div>
                        </div>

                        <div class="form-section">
                            <h2 class="section-title">Resume/CV</h2>
                            <div class="form-group">
                                <label for="resumeFile">Upload New Resume</label>
                                <div style="display: flex; align-items: center; gap: 15px;">
                                    <input type="file" id="resumeFile" name="resumeFile" accept=".pdf,.txt,.docx" style="display: none;">
                                    <label for="resumeFile" class="secondary-btn" id="chooseFileBtn" style="padding: 10px 20px; cursor: pointer; display: inline-block;">
                                        📎 Choose File
                                    </label>
                                    <span id="resumeFileName" style="color: #666;">No file selected</span>
                                </div>
                                <p style="font-size: 0.9em; color: #718096; margin-top: 10px;">
                                    Accepted formats: PDF, TXT, DOCX (Max 5MB)
                                </p>
                            </div>
                            
                            <div id="currentResume" style="display: none;">
                                <div class="form-group">
                                    <label>Current Resume</label>
                                    <div style="background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px;">
                                        <div style="display: flex; justify-content: space-between; align-items: center;">
                                            <div>
                                                <div id="currentResumeFilename" style="font-weight: 600; color: #333;"></div>
                                                <div id="currentResumeDate" style="font-size: 0.85em; color: #718096; margin-top: 5px;"></div>
                                            </div>
                                            <button type="button" class="secondary-btn" id="deleteResumeBtn" style="padding: 8px 16px; font-size: 14px; background: #fee; color: #e53e3e; border-color: #feb2b2;">
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="action-buttons">
                            <button type="submit" class="save-btn" id="saveBtn">
                                <span>💾</span> Save Changes
                            </button>
                            <button type="button" class="cancel-btn" id="cancelBtn">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    async loadProfile() {
        this.loadingSpinner.style.display = 'block';
        
        try {
            const response = await authManager.apiRequest('/api/auth/profile');
            
            if (!response.ok) {
                throw new Error('Failed to load profile');
            }

            const data = await response.json();
            this.populateForm(data.user);

        } catch (error) {
            console.error('Error loading profile:', error);
            this.showAlert('Failed to load profile information', 'error');
        } finally {
            this.loadingSpinner.style.display = 'none';
        }
    }

    populateForm(user) {
        this.currentUserData = user;
        
        // Parse name
        const nameParts = (user.name || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Set form values
        document.getElementById('firstName').value = firstName;
        document.getElementById('lastName').value = lastName;
        document.getElementById('email').value = user.email;

        document.getElementById('role').value = user.role || '';
        document.getElementById('experienceYears').value = user.experience_years || '';
        
        // Display current resume if exists
        if (user.resume_filename && user.resume_content) {
            document.getElementById('currentResume').style.display = 'block';
            document.getElementById('currentResumeFilename').textContent = user.resume_filename;
            if (user.resume_uploaded_at) {
                const uploadDate = new Date(user.resume_uploaded_at);
                document.getElementById('currentResumeDate').textContent = `Uploaded ${this.formatDate(user.resume_uploaded_at)}`;
            }
        }
    }

    setupEventHandlers() {
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
        
        // Resume file input
        const resumeFileInput = document.getElementById('resumeFile');
        const chooseFileBtn = document.getElementById('chooseFileBtn');
        const deleteResumeBtn = document.getElementById('deleteResumeBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        
        // No need for click handler - label element handles it natively
        
        resumeFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Validate file size (5MB max)
                if (file.size > 5 * 1024 * 1024) {
                    this.showAlert('File size must be less than 5MB', 'error');
                    e.target.value = '';
                    return;
                }
                
                this.resumeFile = file;
                document.getElementById('resumeFileName').textContent = file.name;
            } else {
                this.resumeFile = null;
                document.getElementById('resumeFileName').textContent = 'No file selected';
            }
        });
        
        if (deleteResumeBtn) {
            deleteResumeBtn.addEventListener('click', this.deleteResume.bind(this));
        }
        
        cancelBtn.addEventListener('click', this.handleCancel.bind(this));
        
        // Real-time validation
        const inputs = this.form.querySelectorAll('input[required], select[required]');
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

        // Check required fields
        if (field.required && !value) {
            this.showFieldError(fieldGroup, `This field is required`);
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
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    hideAlerts() {
        this.successMessage.style.display = 'none';
        this.errorAlert.style.display = 'none';
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

        if (!isValid) {
            this.showAlert('Please fix the errors before submitting.');
            return;
        }

        // Show loading
        this.saveBtn.disabled = true;
        this.saveBtn.textContent = 'Saving...';
        this.loadingSpinner.style.display = 'block';

        try {
            const formData = new FormData(this.form);
            const firstName = formData.get('firstName');
            const lastName = formData.get('lastName');
            const fullName = `${firstName} ${lastName}`.trim();
            
            const updateData = {
                name: fullName,
                role: formData.get('role'),
                experienceYears: parseInt(formData.get('experienceYears'))
            };

            const response = await authManager.apiRequest('/api/auth/profile', {
                method: 'PUT',
                body: JSON.stringify(updateData)
            });

            const result = await response.json();

            if (response.ok) {
                // Update stored user info
                const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                const updatedUser = { ...currentUser, ...result.user };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                authManager.user = updatedUser;
                
                // Upload resume if a file was selected
                if (this.resumeFile) {
                    await this.uploadResume();
                }
                
                this.showAlert('Profile updated successfully!', 'success');
                
                // Redirect after 2 seconds
                setTimeout(() => {
                    router.navigate('/profile');
                }, 2000);
            } else {
                throw new Error(result.error || 'Update failed');
            }

        } catch (error) {
            console.error('Update error:', error);
            this.showAlert(error.message || 'Failed to update profile. Please try again.');
        } finally {
            this.saveBtn.disabled = false;
            this.saveBtn.innerHTML = '<span>💾</span> Save Changes';
            this.loadingSpinner.style.display = 'none';
        }
    }
    
    async uploadResume() {
        const formData = new FormData();
        formData.append('resume', this.resumeFile);
        
        try {
            const response = await fetch('/api/upload-resume', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: formData
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Resume upload failed');
            }
            
            // Update current resume display
            document.getElementById('currentResume').style.display = 'block';
            document.getElementById('currentResumeFilename').textContent = result.filename;
            document.getElementById('currentResumeDate').textContent = `Uploaded just now`;

            // Update localStorage so practice page reflects it immediately without a refresh
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            user.resume_content = result.content;
            user.resume_filename = result.filename;
            localStorage.setItem('user', JSON.stringify(user));

            // Clear file input
            document.getElementById('resumeFile').value = '';
            document.getElementById('resumeFileName').textContent = 'No file selected';
            this.resumeFile = null;
            
        } catch (error) {
            console.error('Resume upload error:', error);
            throw new Error('Failed to upload resume: ' + error.message);
        }
    }
    
    async deleteResume() {
        if (!confirm('Are you sure you want to delete your resume? This action cannot be undone.')) {
            return;
        }
        
        try {
            const response = await authManager.apiRequest('/api/auth/resume', {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete resume');
            }
            
            // Hide current resume section
            document.getElementById('currentResume').style.display = 'none';
            
            // Update current user data
            this.currentUserData.resume_content = null;
            this.currentUserData.resume_filename = null;
            this.currentUserData.resume_uploaded_at = null;
            
            this.showAlert('Resume deleted successfully', 'success');
            
        } catch (error) {
            console.error('Delete resume error:', error);
            this.showAlert('Failed to delete resume', 'error');
        }
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

    handleCancel() {
        // Navigate back to profile page
        router.navigate('/profile');
    }
}

// Export for use in router
window.EditProfilePage = EditProfilePage;
