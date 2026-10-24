// Canonical URL Handler for SPA - thegoodchatapp.com
(function() {
    // Function to update canonical URL
    function updateCanonicalURL(path) {
        // Remove any query parameters for canonical URL
        const cleanPath = path.split('?')[0];
        const canonicalURL = `https://thegoodchatapp.com${cleanPath}`;
        
        // Find existing canonical link or create new one
        let canonicalLink = document.querySelector('link[rel="canonical"]');
        
        if (!canonicalLink) {
            canonicalLink = document.createElement('link');
            canonicalLink.rel = 'canonical';
            document.head.appendChild(canonicalLink);
        }
        
        canonicalLink.href = canonicalURL;
        
        // Also update meta tags for consistency
        updateMetaTag('og:url', canonicalURL);
        updateMetaTag('twitter:url', canonicalURL);
        
        // Add robots meta tag for pages with query parameters
        if (path.includes('?')) {
            let robotsMeta = document.querySelector('meta[name="robots"]');
            if (!robotsMeta) {
                robotsMeta = document.createElement('meta');
                robotsMeta.name = 'robots';
                document.head.appendChild(robotsMeta);
            }
            robotsMeta.content = 'noindex, follow';
        } else {
            // Remove robots meta for clean URLs
            const robotsMeta = document.querySelector('meta[name="robots"]');
            if (robotsMeta && robotsMeta.content === 'noindex, follow') {
                robotsMeta.remove();
            }
        }
        
        console.log('Canonical URL updated to:', canonicalURL);
    }
    
    // Helper function to update meta tags
    function updateMetaTag(property, content) {
        let meta = document.querySelector(`meta[property="${property}"]`);
        if (!meta) {
            meta = document.querySelector(`meta[name="${property}"]`);
        }
        if (meta) {
            meta.content = content;
        }
    }
    
    // Update canonical on page load
    updateCanonicalURL(window.location.pathname);
    
    // Listen for URL changes (for SPA navigation)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function() {
        originalPushState.apply(history, arguments);
        updateCanonicalURL(window.location.pathname);
    };
    
    history.replaceState = function() {
        originalReplaceState.apply(history, arguments);
        updateCanonicalURL(window.location.pathname);
    };
    
    window.addEventListener('popstate', function() {
        updateCanonicalURL(window.location.pathname);
    });
    
    // Make function globally available
    window.updateCanonicalURL = updateCanonicalURL;
})();