// Universal logger that works in both Node.js and browser
(function() {
    const originalConsole = { ...console };
    
    // Detect environment
    const isBrowser = typeof window !== 'undefined';
    const isProduction = isBrowser 
        ? (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
        : (process.env.NODE_ENV === 'production');
    
    if (isProduction) {
        console.log = () => {};
        console.warn = () => {};
        console.error = () => {};
        console.info = () => {};
        console.debug = () => {};
    }
    
    // Make original console available
    if (isBrowser) {
        window.originalConsole = originalConsole;
    } else {
        global.originalConsole = originalConsole;
    }
})();