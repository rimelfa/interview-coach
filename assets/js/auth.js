// Shared authentication utilities and navigation management

class AuthManager {
    constructor() {
        this.user = null;
        this.token = null;
        this.init();
    }

    init() {
        this.token = localStorage.getItem('authToken');
        this.user = JSON.parse(localStorage.getItem('user') || '{}');
        this.updateNavigation();
    }

    isAuthenticated() {
        return this.token && this.isValidToken(this.token);
    }

    isValidToken(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp > Date.now() / 1000;
        } catch (error) {
            return false;
        }
    }

    getUserInfo() {
        return this.user;
    }

    isAdminUser() {
        const user = this.getUserInfo();
        return user && user.email === 'rimelaafia@gmail.com';
    }

    getToken() {
        return this.token;
    }

    login(userData, token) {
        this.user = userData;
        this.token = token;
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(userData));
        this.updateNavigation();
    }

    logout() {
        this.user = null;
        this.token = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        this.updateNavigation();
        
        // Reset home page content if we're on the home page
        if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
            // Use router's comprehensive home page restoration if available
            if (window.router && typeof window.router.showHomePage === 'function') {
                console.log('Using router showHomePage for logout');
                window.router.showHomePage();
            } else {
                console.log('Router not available, using fallback resetHomePageContent');
                this.resetHomePageContent();
            }
        } else {
            // Redirect to home page
            window.location.href = '/';
        }
    }

    resetHomePageContent() {
        console.log('Auth resetHomePageContent called as fallback');
        
        // Remove all authentication-related classes from body
        document.body.classList.remove('authenticated-user');
        document.body.classList.remove('spa-page');
        
        // Remove any force-hide styles
        const forceHideStyle = document.getElementById('force-hide-marketing');
        if (forceHideStyle) {
            forceHideStyle.remove();
            console.log('Removed force-hide styles from auth fallback');
        }
    }

    checkProfileCompletion() {
        // Prevent multiple simultaneous checks (but allow retry after delay)
        if (this.profileCheckInProgress) {
            // If check is in progress, retry after a short delay
            setTimeout(() => {
                this.checkProfileCompletion();
            }, 100);
            return;
        }
        this.profileCheckInProgress = true;

        // Only check on home page
        if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
            this.removeProfileBanner();
            this.profileCheckInProgress = false;
            return;
        }

        const user = this.getUserInfo();
        if (!user || !user.email) {
            this.profileCheckInProgress = false;
            return;
        }

        // Check if profile is incomplete (missing key fields for Google users)
        const isProfileIncomplete = !user.role || !user.experience_years;

        if (isProfileIncomplete) {
            // Check if auth-actions exists before showing banner
            const authActions = document.querySelector('.auth-actions');
            
            if (!authActions) {
                // Auth content not ready, retry after delay
                this.profileCheckInProgress = false;
                setTimeout(() => {
                    this.checkProfileCompletion();
                }, 200);
                return;
            }
            this.showProfileCompletionBanner();
        } else {
            this.removeProfileBanner();
        }
        
        this.profileCheckInProgress = false;
    }

    showProfileCompletionBanner() {
        // Don't create banner if it already exists and is visible
        const existingBanner = document.getElementById('profile-completion-banner');
        if (existingBanner && existingBanner.style.opacity !== '0') {
            return;
        }
        
        // Remove existing banner immediately (no animation when replacing)
        if (existingBanner) {
            existingBanner.remove();
        }

        // Create banner
        const banner = document.createElement('div');
        banner.id = 'profile-completion-banner';
        banner.style.marginTop = '40px';
        banner.style.opacity = '0';
        banner.style.transform = 'translateY(-20px)';
        banner.style.transition = 'all 0.3s ease';
        banner.innerHTML = `
            <div class="banner-content">
                <div class="banner-text">
                    <strong>Complete your profile for the best experience!</strong>
                    <p>Add your location, role, and experience level to get personalized interview questions.</p>
                </div>
                <div class="banner-actions">
                    <a href="/profile" class="banner-btn banner-btn-primary">Complete Profile</a>
                </div>
            </div>
        `;

        // Insert banner below the auth-actions buttons (inside the authenticated content)
        const authActions = document.querySelector('.auth-actions');
        if (authActions) {
            // Insert right after auth-actions (which contains the buttons)
            authActions.insertAdjacentElement('afterend', banner);
            
            // Trigger smooth entrance animation
            requestAnimationFrame(() => {
                banner.style.opacity = '1';
                banner.style.transform = 'translateY(0)';
            });
        } else {
            // Fallback: insert inside authenticated content if auth-actions not found
            const authenticatedContent = document.querySelector('.authenticated-user-content');
            if (authenticatedContent) {
                authenticatedContent.appendChild(banner);
                
                // Trigger smooth entrance animation
                requestAnimationFrame(() => {
                    banner.style.opacity = '1';
                    banner.style.transform = 'translateY(0)';
                });
            }
        }
    }

    removeProfileBanner() {
        const existingBanner = document.getElementById('profile-completion-banner');
        if (existingBanner) {
            // Smooth exit animation
            existingBanner.style.opacity = '0';
            existingBanner.style.transform = 'translateY(-20px)';
            
            // Remove from DOM after animation completes
            setTimeout(() => {
                if (existingBanner.parentNode) {
                    existingBanner.remove();
                }
            }, 300);
        }
    }

    dismissProfileBanner() {
        this.removeProfileBanner();
        // Banner will reappear on next page load if profile is still incomplete
    }


    showMarketingSections() {
        console.log('Auth showMarketingSections called');
        
        // List of marketing sections to show with their default display values
        const sectionsToShow = [
            { selector: '.hero-section', display: 'flex' },
            { selector: '.features-section', display: 'block' }, 
            { selector: '.stats-section', display: 'block' },
            { selector: '.how-it-works-section', display: 'block' },
            { selector: '.testimonials-section', display: 'block' },
            { selector: '.faq-section', display: 'block' },
            { selector: '.cta-section', display: 'block' },
            { selector: '.footer', display: 'block' }
        ];
        
        // Force a reflow by reading offsetHeight
        document.body.offsetHeight;
        
        sectionsToShow.forEach(({ selector, display }) => {
            const section = document.querySelector(selector);
            if (section) {
                // Remove ALL inline styles first
                section.removeAttribute('style');
                
                // Then set the correct display
                section.style.display = display;
                section.style.visibility = 'visible';
                
                console.log(`Auth shown section: ${selector} (${display})`);
            } else {
                console.log(`Auth section not found: ${selector}`);
            }
        });
        
        // Force another reflow to ensure changes take effect
        document.body.offsetHeight;
        
        console.log('Auth showMarketingSections completed');
    }

    updateNavigation() {
        const navMenu = document.querySelector('.nav-menu');
        if (!navMenu) return;

        // Remove existing auth nav items
        const existingAuthItems = navMenu.querySelectorAll('.auth-nav-item');
        existingAuthItems.forEach(item => item.remove());

        if (this.isAuthenticated()) {
            // Check if user needs to complete profile
            this.checkProfileCompletion();
            // User is logged in - show main navigation and dropdown menu
            navMenu.innerHTML = `
                <li class="nav-item auth-nav-item nav-desktop-only" style="margin-left: auto;">
                    <a href="/practice" class="nav-link">Practice</a>
                </li>
                <li class="nav-item auth-nav-item nav-desktop-only">
                    <a href="/dashboard" class="nav-link">Dashboard</a>
                </li>
                <li class="nav-item dropdown auth-nav-item">
                    <button class="nav-link dropdown-toggle" onclick="toggleDropdown(event)">
                        <svg width="20" height="16" viewBox="0 0 20 16" fill="currentColor">
                            <rect x="0" y="0" width="20" height="2.5" rx="1.25"/>
                            <rect x="0" y="6.75" width="20" height="2.5" rx="1.25"/>
                            <rect x="0" y="13.5" width="20" height="2.5" rx="1.25"/>
                        </svg>
                    </button>
                    <ul class="dropdown-menu">
                        <li><a href="/practice" class="dropdown-link">Practice</a></li>
                        <li><a href="/dashboard" class="dropdown-link">Dashboard</a></li>
                        <li><a href="/profile" class="dropdown-link">Profile</a></li>
                        <li><a href="/pricing" class="dropdown-link">Pricing</a></li>
                        <li><a href="/guides" class="dropdown-link">Interview Guides</a></li>
                        <li><a href="/features" class="dropdown-link">Features</a></li>
                        <li><a href="/practice-info" class="dropdown-link">Practice Info</a></li>
                        <li><a href="/dashboard-info" class="dropdown-link">Dashboard Info</a></li>
                        <li><a href="/how-it-works" class="dropdown-link">How It Works</a></li>
                        ${this.isAdminUser() ? '<li><a href="/admin-dashboard" class="dropdown-link">Admin</a></li>' : ''}
                        <li><a href="#" class="dropdown-link" onclick="authManager.logout(); return false;">Logout</a></li>
                    </ul>
                </li>
            `;
            
            // Simple mobile menu handles navigation updates automatically
        } else {
            // User is not logged in - show login and signup
            navMenu.innerHTML = `
                <li class="nav-item ${window.location.pathname === '/' || window.location.pathname === '/index.html' ? 'active' : ''}">
                    <a href="/" class="nav-link">Home</a>
                </li>
                <li class="nav-item ${window.location.pathname === '/pricing' ? 'active' : ''}">
                    <a href="/pricing" class="nav-link">Pricing</a>
                </li>
                <li class="nav-item dropdown auth-nav-item" style="margin-left: auto;">
                    <button class="nav-link dropdown-toggle" onclick="toggleDropdown(event)">
                        <svg width="20" height="16" viewBox="0 0 20 16" fill="currentColor">
                            <rect x="0" y="0" width="20" height="2.5" rx="1.25"/>
                            <rect x="0" y="6.75" width="20" height="2.5" rx="1.25"/>
                            <rect x="0" y="13.5" width="20" height="2.5" rx="1.25"/>
                        </svg>
                    </button>
                    <ul class="dropdown-menu">
                        <li><a href="/guides" class="dropdown-link">Interview Guides</a></li>
                        <li><a href="/features" class="dropdown-link">Features</a></li>
                        <li><a href="/practice-info" class="dropdown-link">Practice Info</a></li>
                        <li><a href="/dashboard-info" class="dropdown-link">Dashboard Info</a></li>
                        <li><a href="/how-it-works" class="dropdown-link">How It Works</a></li>
                        <li><a href="/login" class="dropdown-link">Login</a></li>
                        <li><a href="/signup" class="dropdown-link">Sign Up</a></li>
                    </ul>
                </li>
            `;
            
            // Simple mobile menu handles navigation updates automatically
        }
    }

    requireAuth() {
        if (!this.isAuthenticated()) {
            alert('Please log in to access this page');
            window.location.href = '/login';
            return false;
        }
        return true;
    }

    // Test token validity with server
    async testTokenValidity() {
        console.log('Testing token validity...');
        const token = this.getToken();
        if (!token) {
            console.log('No token found');
            return false;
        }
        
        // Decode token to check expiration locally
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Date.now() / 1000;
            console.log('Token issued at:', new Date(payload.iat * 1000));
            console.log('Token expires at:', new Date(payload.exp * 1000));
            console.log('Current time:', new Date());
            console.log('Token expires in:', Math.floor(payload.exp - now), 'seconds');
            console.log('Token should be expired:', payload.exp < now);
        } catch (e) {
            console.error('Could not decode token:', e);
        }
        
        try {
            const response = await fetch('/api/dashboard/progress', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log('Token test response status:', response.status);
            
            if (response.status === 401 || response.status === 403) {
                console.log('Token expired - logging out');
                this.logout();
                return false;
            }
            
            console.log('Token is still valid according to server');
            return true;
        } catch (error) {
            console.error('Token test error:', error);
            return false;
        }
    }

    // Make authenticated API requests
    async apiRequest(url, options = {}) {
        const token = this.getToken();
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, mergedOptions);
            
            if (response.status === 401 || response.status === 403) {
                // Token expired or invalid
                this.logout();
                throw new Error('Authentication required. Please log in again.');
            }

            return response;
        } catch (error) {
            throw error;
        }
    }
}

// Global auth manager instance
const authManager = new AuthManager();

// Dropdown functionality
function toggleDropdown(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const dropdown = event.target.closest('.dropdown');
    const menu = dropdown.querySelector('.dropdown-menu');
    
    // Close other dropdowns
    document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
        if (menu !== event.target.nextElementSibling) {
            menu.classList.remove('show');
        }
    });
    
    menu.classList.toggle('show');
}

// Close dropdown when clicking outside
document.addEventListener('click', (event) => {
    if (!event.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
            menu.classList.remove('show');
        });
    }
});

// Features modal functionality
function showFeaturesModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>✨ Features & About</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="feature-section">
                    <h3>🎯 Practice Mode</h3>
                    <p>Interactive AI interviewer that asks realistic questions and provides feedback on your responses.</p>
                </div>
                <div class="feature-section">
                    <h3>📊 Dashboard</h3>
                    <p>Track your progress, view session history, and analyze your performance over time.</p>
                </div>
                <div class="feature-section">
                    <h3>🤖 AI-Powered Feedback</h3>
                    <p>Get intelligent suggestions and feedback to improve your interview skills.</p>
                </div>
                <div class="feature-section">
                    <h3>📈 Progress Tracking</h3>
                    <p>Monitor your improvement with detailed analytics and performance metrics.</p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

// Update navigation when page loads
document.addEventListener('DOMContentLoaded', () => {
    authManager.updateNavigation();
});
