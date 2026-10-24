class ContactPage {
    constructor() {
        this.init();
    }

    init() {
        this.render();
    }

    getStyles() {
        return `
        .contact-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            line-height: 1.6;
            color: #333;
        }

        .contact-header {
            text-align: center;
            margin-bottom: 50px;
        }

        .contact-title {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .contact-subtitle {
            font-size: 1.2rem;
            color: #666;
            max-width: 600px;
            margin: 0 auto;
        }

        .contact-section {
            margin-bottom: 40px;
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .section-title {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 20px;
            color: #2d3748;
        }

        .contact-methods {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 30px;
            margin-top: 30px;
        }

        .contact-method {
            text-align: center;
            padding: 30px 20px;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .contact-method:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }

        .contact-icon {
            font-size: 2.5rem;
            margin-bottom: 15px;
            display: flex;
            justify-content: center;
            opacity: 0.85;
        }

        .contact-method h3 {
            font-size: 1.2rem;
            font-weight: 600;
            margin-bottom: 10px;
            color: #2d3748;
        }

        .contact-method p {
            color: #666;
            margin-bottom: 15px;
        }

        .contact-link {
            display: inline-block;
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
            padding: 8px 16px;
            border: 1px solid #667eea;
            border-radius: 6px;
            transition: all 0.2s ease;
        }

        .contact-link:hover {
            background: #667eea;
            color: white;
        }

        .response-time {
            background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
            padding: 25px;
            border-radius: 8px;
            text-align: center;
            margin-top: 30px;
        }

        .response-time h4 {
            margin-bottom: 10px;
            color: #2d3748;
        }

        .faq-section {
            margin-top: 20px;
        }

        .faq-item {
            margin-bottom: 25px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }

        .faq-question {
            font-weight: 600;
            margin-bottom: 10px;
            color: #2d3748;
        }

        .faq-answer {
            color: #4a5568;
            line-height: 1.6;
        }

        @media (max-width: 768px) {
            .contact-container {
                padding: 20px 15px;
            }

            .contact-title {
                font-size: 2rem;
            }

            .contact-section {
                padding: 20px;
            }

            .contact-methods {
                grid-template-columns: 1fr;
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

        .contact-container {
            max-width: 900px;
            margin: 32px auto 50px;
            padding: 0 20px 10px;
        }

        .contact-header {
            background: linear-gradient(135deg, #e0f2fe 0%, #fef9c3 55%, #dcfce7 100%);
            padding: 32px;
            border-radius: 26px;
            box-shadow: 0 18px 34px rgba(15, 23, 42, 0.12);
            border: 1px solid rgba(255, 255, 255, 0.9);
            margin-bottom: 32px;
        }

        .contact-title {
            background: none;
            -webkit-text-fill-color: var(--ink);
            color: var(--ink);
            font-weight: 800;
        }

        .contact-subtitle {
            color: var(--muted);
        }

        .contact-section {
            background: var(--card);
            border-radius: 22px;
            border: 1px solid rgba(226, 232, 240, 0.7);
            box-shadow: var(--shadow);
        }

        .section-title {
            color: var(--ink);
        }

        .contact-method {
            background: #ffffff;
            border-radius: 20px;
            border: 1px solid rgba(226, 232, 240, 0.7);
            box-shadow: 0 12px 22px rgba(15, 23, 42, 0.06);
        }

        .contact-method p,
        .contact-method h3 {
            color: var(--ink);
        }

        .contact-method p {
            color: var(--muted);
        }

        .contact-link {
            border-radius: 999px;
            border: 1px solid rgba(125, 211, 252, 0.8);
            color: #0ea5e9;
        }

        .contact-link:hover {
            background: #e0f2fe;
            color: #0284c7;
        }

        .response-time {
            background: linear-gradient(135deg, #fef9c3 0%, #ecfeff 100%);
            border-radius: 18px;
            border: 1px solid rgba(226, 232, 240, 0.7);
        }

        .faq-item {
            background: #ffffff;
            border-radius: 18px;
            border-left: 4px solid #bae6fd;
            box-shadow: 0 10px 18px rgba(15, 23, 42, 0.06);
        }
        `;
    }

    getHTML() {
        return `
        <div class="contact-container">
            <div class="contact-header">
                <h1 class="contact-title">Contact Us</h1>
                <p class="contact-subtitle">We're here to help you succeed in your interview journey. Get in touch with any questions or feedback.</p>
            </div>

            <div class="contact-section">
                <h2 class="section-title">Get in Touch</h2>
                <div class="contact-methods">
                    <div class="contact-method">
                        <span class="contact-icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span>
                        <h3>Email Support</h3>
                        <p>For all inquiries, support, and feedback</p>
                        <a href="mailto:support@thegoodchatapp.com" class="contact-link">support@thegoodchatapp.com</a>
                    </div>
                </div>

                <div class="response-time">
                    <h4><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:6px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Response Time</h4>
                    <p>We aim to respond to all inquiries within 24-48 hours during business days.</p>
                </div>
            </div>


        </div>
        `;
    }

    render() {
        // Apply styles
        const styleElement = document.createElement('style');
        styleElement.textContent = this.getStyles();
        document.head.appendChild(styleElement);

        // Set page content
        const app = document.getElementById('app');
        if (app) {
            app.style.display = 'block';
            app.innerHTML = this.getHTML();
        }

        // Update page title
        document.title = 'Contact Us - Good Chat';
        
        // Add SPA page class to hide footer marketing sections
        document.body.classList.add('spa-page');
    }
}

// Make the class available globally
window.ContactPage = ContactPage;
