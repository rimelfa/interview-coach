// Simple Mobile Menu - Direct Navigation

class SimpleMobileMenu {
    constructor() {
        this.isOpen = false;
        this.isToggling = false;
        this.preventScroll = this.preventScroll.bind(this);
        this.init();
    }

    init() {
        this.createMobileButton();
        this.setupEventListeners();
        this.handleExistingNavigation();
    }

    createMobileButton() {
        console.log('Creating mobile button...');
        // Remove existing button
        const existingButton = document.querySelector('.simple-mobile-toggle');
        if (existingButton) existingButton.remove();

        const nav = document.querySelector('.top-navigation');
        if (!nav) {
            console.log('No .top-navigation found');
            return;
        }

        const button = document.createElement('button');
        button.className = 'simple-mobile-toggle';
        button.innerHTML = `
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
        `;
        
        // Add styles directly
        button.style.cssText = `
            display: none;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            width: 30px;
            height: 30px;
            background: none;
            border: none;
            cursor: pointer;
            padding: 0;
            z-index: 1003;
            position: relative;
        `;

        // Style hamburger lines
        const lines = button.querySelectorAll('.hamburger-line');
        lines.forEach((line, index) => {
            line.style.cssText = `
                width: 20px;
                height: 2px;
                background: #4a5568;
                margin: 2px 0;
                transition: all 0.3s ease;
                display: block;
                transform-origin: center;
            `;
        });

        // Show on mobile
        const mediaQuery = window.matchMedia('(max-width: 767px)');
        const updateButtonVisibility = () => {
            button.style.display = mediaQuery.matches ? 'flex' : 'none';
        };
        updateButtonVisibility();
        mediaQuery.addListener(updateButtonVisibility);

        nav.appendChild(button);
        console.log('Mobile button created and added to nav');
    }

    // Overlay functionality removed - not needed for hamburger menu

    setupEventListeners() {
        // Toggle button click
        document.addEventListener('click', (e) => {
            if (e.target.closest('.simple-mobile-toggle')) {
                e.preventDefault();
                e.stopPropagation();
                this.toggle();
                return;
            }
        });

        // Close menu when clicking outside of it
        document.addEventListener('click', (e) => {
            // Don't close if clicking on the X button (it handles its own closing)
            if (e.target.closest('#mobile-x-button')) {
                return;
            }
            
            // Don't close if clicking on the hamburger button or menu items
            if (e.target.closest('.simple-mobile-toggle') || e.target.closest('.nav-menu')) {
                return;
            }
            
            // If menu is open and clicking anywhere else, close it
            if (this.isOpen) {
                e.preventDefault();
                e.stopPropagation();
                this.close();
                console.log('Menu closed by clicking outside');
            }
        });

        // Navigation link clicks
        document.addEventListener('click', (e) => {
            const link = e.target.closest('.nav-menu a, .dropdown-menu a');
            
            if (link && this.isOpen) {
                e.preventDefault();
                e.stopPropagation();
                
                // Close menu first
                this.close();
                
                // Handle navigation after a short delay
                setTimeout(() => {
                    this.handleLinkNavigation(link);
                }, 100);
            }
        }, true);
    }

    handleLinkNavigation(link) {
        const href = link.getAttribute('href');
        const onclick = link.getAttribute('onclick');

        console.log('Mobile menu navigation:', { href, onclick, linkText: link.textContent });

        // Special handling for admin dashboard
        if (href === '/admin-dashboard') {
            console.log('Admin dashboard navigation detected');
            window.location.href = '/admin-dashboard';
            return;
        }

        if (onclick && onclick.trim() !== '') {
            // Execute onclick handler
            try {
                console.log('Executing onclick:', onclick);
                const func = new Function(onclick);
                func.call(link);
            } catch (error) {
                console.error('Error executing onclick:', error);
                // Fallback to href navigation
                if (href && href !== '#') {
                    this.navigateToUrl(href);
                }
            }
        } else if (href && href !== '#' && !href.includes('javascript:')) {
            // Regular navigation
            console.log('Regular navigation to:', href);
            this.navigateToUrl(href);
        }
    }

    navigateToUrl(url) {
        console.log('navigateToUrl called with:', url);
        try {
            // Try router first
            const router = window.router || window.appRouter;
            console.log('Router available:', !!router, typeof router?.navigate);
            
            if (router && typeof router.navigate === 'function') {
                const path = new URL(url, window.location.origin).pathname;
                console.log('Using router to navigate to:', path);
                router.navigate(path);
            } else {
                console.log('Using window.location.href for navigation');
                window.location.href = url;
            }
        } catch (error) {
            console.error('Navigation error, falling back to window.location.href:', error);
            window.location.href = url;
        }
    }

    handleExistingNavigation() {
        // Watch for navigation changes and reinitialize
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    const navMenu = document.querySelector('.nav-menu');
                    if (navMenu && mutation.target.contains(navMenu)) {
                        setTimeout(() => this.setupEventListeners(), 100);
                    }
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    toggle() {
        console.log('Toggle called, isOpen:', this.isOpen);
        if (this.isToggling) {
            return;
        }
        
        this.isToggling = true;
        
        if (this.isOpen) {
            console.log('Closing menu');
            this.close();
        } else {
            console.log('Opening menu');
            this.open();
        }
        
        // Reset toggle flag after animation
        setTimeout(() => {
            this.isToggling = false;
        }, 350);
    }

    preventScroll(e) {
        e.preventDefault();
    }

    open() {
        this.isOpen = true;

        const navMenu = document.querySelector('.nav-menu');
        const button = document.querySelector('.simple-mobile-toggle');

        if (navMenu) {
            navMenu.classList.add('active');
            navMenu.style.pointerEvents = 'auto';
            navMenu.style.zIndex = '1001';
            
            // Ensure all links are clickable
            const links = navMenu.querySelectorAll('a');
            links.forEach(link => {
                link.style.pointerEvents = 'auto';
                link.style.zIndex = '1002';
                link.style.position = 'relative';
                link.style.display = 'block';
            });
        }

        if (button) {
            button.classList.add('active');
            console.log('Adding active class to button');
            
            // Hide the original button completely
            button.style.display = 'none';
            
            // Remove any existing X button
            const existingXButton = document.getElementById('mobile-x-button');
            if (existingXButton) {
                existingXButton.remove();
            }
            
            // Create a completely new X button with clean styling
            const xButton = document.createElement('div');
            xButton.id = 'mobile-x-button';
            xButton.textContent = '✕';
            xButton.style.cssText = `
                position: fixed !important;
                top: 15px !important;
                right: 15px !important;
                width: 30px !important;
                height: 30px !important;
                background: none !important;
                color: #4a5568 !important;
                border: none !important;
                font-size: 24px !important;
                font-weight: normal !important;
                font-family: Arial, sans-serif !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                cursor: pointer !important;
                z-index: 999999 !important;
                line-height: 1 !important;
                text-align: center !important;
                user-select: none !important;
                opacity: 1 !important;
                visibility: visible !important;
                pointer-events: auto !important;
            `;
            
            // Add click event to the new X button
            xButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('X button clicked');
                this.close();
            });
            
            // Add it directly to body
            document.body.appendChild(xButton);
            
            console.log('Created new red X button and added to body');
        }

        // Prevent body scroll with multiple techniques for better mobile support
        this.scrollY = window.scrollY;
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${this.scrollY}px`;
        document.body.style.width = '100%';
        
        // Additional iOS Safari fix
        document.addEventListener('touchmove', this.preventScroll, { passive: false });
    }

    close() {
        this.isOpen = false;

        const navMenu = document.querySelector('.nav-menu');
        const button = document.querySelector('.simple-mobile-toggle');

        if (navMenu) {
            navMenu.classList.remove('active');
        }

        // Remove the X button
        const xButton = document.getElementById('mobile-x-button');
        if (xButton) {
            xButton.remove();
            console.log('X button removed');
        }

        if (button) {
            button.classList.remove('active');
            
            // Show the original button again
            button.style.display = 'flex';
            
            // Restore original hamburger lines
            button.innerHTML = `
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
            `;
            
            // Re-apply line styles
            const lines = button.querySelectorAll('.hamburger-line');
            lines.forEach((line, index) => {
                line.style.cssText = `
                    width: 20px;
                    height: 2px;
                    background: #4a5568;
                    margin: 2px 0;
                    transition: all 0.3s ease;
                    display: block;
                    transform-origin: center;
                `;
            });
            
            console.log('Button content restored to hamburger lines');
        }

        // Restore body scroll and position
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        
        // Restore scroll position
        if (this.scrollY !== undefined) {
            window.scrollTo(0, this.scrollY);
            this.scrollY = undefined;
        }
        
        // Remove iOS Safari fix
        document.removeEventListener('touchmove', this.preventScroll, { passive: false });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.simpleMobileMenu = new SimpleMobileMenu();
    });
} else {
    window.simpleMobileMenu = new SimpleMobileMenu();
}