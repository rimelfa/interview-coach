// Google OAuth Authentication Handler
class GoogleAuth {
    constructor() {
        this.clientId = null;
        this.isInitialized = false;
    }

    async init(clientId) {
        this.clientId = clientId;
        
        // Load the Google Identity Services library
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = () => {
                this.isInitialized = true;
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    renderButton(buttonContainerId, options = {}) {
        if (!this.isInitialized || !window.google) {
            console.error('Google Auth not initialized');
            return;
        }

        const defaultOptions = {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left'
        };

        try {
            google.accounts.id.initialize({
                client_id: this.clientId,
                callback: this.handleCredentialResponse.bind(this),
                auto_select: false,
                cancel_on_tap_outside: true
            });

            const container = document.getElementById(buttonContainerId);
            
            google.accounts.id.renderButton(
                container,
                { ...defaultOptions, ...options }
            );
        } catch (error) {
            console.warn('Google Sign-In button render warning:', error);
            // If Google fails to render, create a placeholder button
            this.createPlaceholderButton(buttonContainerId, options.text || 'continue_with');
        }
    }

    createPlaceholderButton(containerId, textType) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const buttonText = textType === 'signin_with' ? 'Sign in with Google' : 
                          textType === 'signup_with' ? 'Sign up with Google' : 
                          'Continue with Google';

        container.innerHTML = `
            <button class="google-signin-placeholder" onclick="alert('Please configure Google OAuth by adding a valid GOOGLE_CLIENT_ID to your .env file')">
                <svg width="18" height="18" viewBox="0 0 18 18" style="margin-right: 8px">
                    <path fill="#4285F4" d="M17.64,9.20454545 C17.64,8.56636364 17.5827273,7.95272727 17.4763636,7.36363636 L9,7.36363636 L9,10.845 L13.8436364,10.845 C13.635,11.97 13.0009091,12.9231818 12.0477273,13.5613636 L12.0477273,15.8195455 L14.9563636,15.8195455 C16.6581818,14.2527273 17.64,11.9454545 17.64,9.20454545 L17.64,9.20454545 Z"/>
                    <path fill="#34A853" d="M9,18 C11.43,18 13.4672727,17.1940909 14.9563636,15.8195455 L12.0477273,13.5613636 C11.2418182,14.1013636 10.2109091,14.4204545 9,14.4204545 C6.65590909,14.4204545 4.67181818,12.8372727 3.96409091,10.71 L0.957272727,10.71 L0.957272727,13.0418182 C2.43818182,15.9831818 5.48181818,18 9,18 L9,18 Z"/>
                    <path fill="#FBBC05" d="M3.96409091,10.71 C3.78409091,10.17 3.68181818,9.59318182 3.68181818,9 C3.68181818,8.40681818 3.78409091,7.83 3.96409091,7.29 L3.96409091,4.95818182 L0.957272727,4.95818182 C0.347727273,6.17318182 0,7.54772727 0,9 C0,10.4522727 0.347727273,11.8268182 0.957272727,13.0418182 L3.96409091,10.71 L3.96409091,10.71 Z"/>
                    <path fill="#EA4335" d="M9,3.57954545 C10.3213636,3.57954545 11.5077273,4.03363636 12.4404545,4.92545455 L15.0218182,2.34409091 C13.4631818,0.891818182 11.4259091,0 9,0 C5.48181818,0 2.43818182,2.01681818 0.957272727,4.95818182 L3.96409091,7.29 C4.67181818,5.16272727 6.65590909,3.57954545 9,3.57954545 L9,3.57954545 Z"/>
                </svg>
                ${buttonText}
            </button>
            <style>
                .google-signin-placeholder {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    padding: 15px;
                    background: white;
                    border: 1px solid #dadce0;
                    border-radius: 12px;
                    color: #3c4043;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    height: 46px;
                    box-sizing: border-box;
                }
                .google-signin-placeholder:hover {
                    background: #f8f9fa;
                    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
                    border-color: #d2d2d2;
                    transform: translateY(-1px);
                }
                .google-signin-placeholder:active {
                    background: #e8eaed;
                    transform: translateY(0);
                }
            </style>
        `;
    }

    async handleCredentialResponse(response) {
        try {
            console.log('Google credential response received:', response);
            
            // Show full-screen loading overlay immediately
            this.showRedirectLoading();

            // Send the ID token to your backend
            const res = await fetch('/api/auth/google', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    idToken: response.credential
                })
            });

            console.log('Backend response status:', res.status);
            const data = await res.json();
            console.log('Backend response data:', data);

            if (res.ok) {
                // Store the JWT token (same key as traditional login)
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                // Track signup or login with Reddit Pixel
                if (window.redditTracking) {
                    if (data.isNewUser) {
                        window.redditTracking.trackSignUp(data.user);
                    } else {
                        window.redditTracking.trackLogin(data.user);
                    }
                }

                // Track new signup with Google Ads
                if (data.isNewUser && typeof gtag !== 'undefined') {
                    gtag('event', 'conversion', {
                        'send_to': 'AW-958968799/EP6tCPaY850cEN_noskD'
                    });
                }

                console.log('Stored token and user data');

                // Loading overlay already shown at start

                // Redirect based on whether it's a new user and test completion status
                setTimeout(() => {
                    const currentPath = window.location.pathname;
                    const urlParams = new URLSearchParams(window.location.search);
                    const redirect = urlParams.get('redirect');

                    if (redirect) {
                        window.location.href = `/${redirect}?google_auth=1`;
                    } else {
                        window.location.href = '/practice?google_auth=1';
                    }
                }, 1500);
            } else {
                console.error('Authentication failed:', data);
                this.showError(data.error || 'Google authentication failed');
            }
        } catch (error) {
            console.error('Google auth error:', error);
            console.error('Error stack:', error.stack);
            this.showError('Failed to authenticate with Google. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    showLoading() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.style.display = 'block';
        }
    }

    hideLoading() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.style.display = 'none';
        }
    }

    showSuccess(message) {
        const successEl = document.getElementById('successMessage');
        if (successEl) {
            successEl.textContent = message;
            successEl.style.display = 'block';
        }
    }

    showError(message) {
        const errorEl = document.getElementById('errorAlert');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
    }

    showRedirectLoading() {
        // Hide all page content
        document.body.style.overflow = 'hidden';
        
        // Create overlay with loading spinner
        const overlay = document.createElement('div');
        overlay.id = 'google-auth-loading-overlay';
        overlay.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                z-index: 10000;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            ">
                <div style="
                    width: 50px;
                    height: 50px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #667eea;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 20px;
                "></div>
                <p style="
                    color: #4a5568;
                    font-size: 16px;
                    margin: 0;
                    text-align: center;
                ">Redirecting...</p>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        
        document.body.appendChild(overlay);
    }

    // One-tap sign-in (optional)
    showOneTap() {
        if (!this.isInitialized || !window.google) {
            return;
        }

        google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed()) {
                console.log('One-tap not displayed:', notification.getNotDisplayedReason());
            } else if (notification.isSkippedMoment()) {
                console.log('One-tap skipped:', notification.getSkippedReason());
            }
        });
    }
}

// Export for use in other files
window.GoogleAuth = GoogleAuth;