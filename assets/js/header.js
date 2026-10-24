// Shared site header — injected into every page before auth.js populates nav-menu.
(function () {
    function buildHeader() {
        if (document.getElementById('site-header')) return;
        var el = document.createElement('div');
        el.id = 'site-header';
        el.innerHTML =
            '<nav class="top-navigation">' +
            '<div class="nav-brand">' +
            '<a href="/">' +
            '<img src="/logo.png" alt="Good Chat Logo">' +
            '<span class="brand-name">Good Chat</span>' +
            '</a>' +
            '</div>' +
            '<ul class="nav-menu" id="nav-menu"></ul>' +
            '<span id="status-chip"></span>' +
            '</nav>';
        document.body.insertBefore(el, document.body.firstChild);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildHeader);
    } else {
        buildHeader();
    }
})();
