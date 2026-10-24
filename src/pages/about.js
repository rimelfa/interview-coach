class AboutPage {
    constructor() {
        this.init();
    }

    init() {
        this.render();
    }

    getStyles() {
        return `
        .about-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            line-height: 1.6;
            color: #333;
        }

        .about-header {
            text-align: center;
            margin-bottom: 50px;
        }

        .about-title {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .about-subtitle {
            font-size: 1.2rem;
            color: #666;
            max-width: 600px;
            margin: 0 auto;
        }

        .about-section {
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
            color: #2d3748 !important;
        }

        /* Force all section titles to be dark - same approach as terms and privacy pages */
        .about-container .about-section h2,
        .about-container .about-section .section-title,
        .about-container .section-title,
        .about-section h2,
        .about-section .section-title,
        .about-section h2.section-title,
        h2.section-title {
            color: #2d3748 !important;
            font-weight: 600 !important;
            opacity: 1 !important;
            text-shadow: none !important;
            filter: none !important;
            -webkit-text-fill-color: #2d3748 !important;
            -webkit-text-stroke: none !important;
        }

        .section-content {
            font-size: 1rem;
            line-height: 1.7;
            color: #4a5568;
        }

        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }

        .feature-item {
            padding: 20px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            text-align: center;
        }

        .feature-icon {
            font-size: 2rem;
            margin-bottom: 10px;
            display: flex;
            justify-content: center;
            opacity: 0.85;
        }

        .feature-title {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 10px;
            color: #2d3748 !important;
        }

        .feature-description {
            font-size: 0.9rem;
            color: #666;
        }

        .team-info {
            background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            margin-top: 40px;
        }

        @media (max-width: 768px) {
            .about-container {
                padding: 20px 15px;
            }

            .about-title {
                font-size: 2rem;
            }

            .about-section {
                padding: 20px;
            }

            .features-grid {
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

        .about-container {
            max-width: 900px;
            margin: 32px auto 50px;
            padding: 0 20px 10px;
        }

        .about-header {
            background: linear-gradient(135deg, #e0f2fe 0%, #fef9c3 55%, #dcfce7 100%);
            padding: 32px;
            border-radius: 26px;
            box-shadow: 0 18px 34px rgba(15, 23, 42, 0.12);
            border: 1px solid rgba(255, 255, 255, 0.9);
            margin-bottom: 32px;
        }

        .about-title {
            background: none;
            -webkit-text-fill-color: var(--ink);
            color: var(--ink);
            font-weight: 800;
        }

        .about-subtitle {
            color: var(--muted);
        }

        .about-section {
            background: var(--card);
            border-radius: 22px;
            border: 1px solid rgba(226, 232, 240, 0.7);
            box-shadow: var(--shadow);
        }

        .about-container .section-title,
        .about-container h2.section-title {
            color: var(--ink) !important;
        }

        .section-content {
            color: var(--muted);
        }

        .features-grid {
            gap: 24px;
        }

        .about-container .feature-item {
            background: #ffffff;
            border-radius: 18px;
            border: 1px solid rgba(226, 232, 240, 0.7);
            box-shadow: 0 12px 22px rgba(15, 23, 42, 0.06);
        }

        .about-container .feature-title {
            color: var(--ink) !important;
        }

        .feature-description {
            color: var(--muted);
        }

        .team-info {
            background: linear-gradient(135deg, #fef9c3 0%, #ecfeff 100%);
            border-radius: 22px;
            border: 1px solid rgba(255, 255, 255, 0.9);
            box-shadow: var(--shadow);
        }
        `;
    }

    getHTML() {
        return `
        <div class="about-container">
            <div class="about-header">
                <h1 class="about-title">About Good Chat</h1>
                <p class="about-subtitle">Empowering professionals to ace their interviews with AI-powered coaching and personalized feedback</p>
            </div>

            <div class="about-section">
                <h2 class="section-title">My Mission</h2>
                <div class="section-content">
                    <p>At Good Chat, I believe that landing your dream job shouldn't be left to chance. My mission is to democratize interview preparation by providing everyone with access to world-class coaching, regardless of their background or budget.</p>
                    
                    <p>I use cutting-edge artificial intelligence to create personalized interview experiences that adapt to your specific role, industry, and skill level. My platform helps you practice, improve, and gain the confidence needed to succeed in any interview situation.</p>
                </div>
            </div>

            <div class="about-section">
                <h2 class="section-title">What Makes Good Chat Different</h2>
                <div class="features-grid">
                    <div class="feature-item">
                        <div class="feature-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="2" x2="9" y2="4"/><line x1="15" y1="2" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="22"/><line x1="15" y1="20" x2="15" y2="22"/><line x1="20" y1="9" x2="22" y2="9"/><line x1="20" y1="15" x2="22" y2="15"/><line x1="2" y1="9" x2="4" y2="9"/><line x1="2" y1="15" x2="4" y2="15"/></svg></div>
                        <h3 class="feature-title">AI-Powered Coaching</h3>
                        <p class="feature-description">Advanced AI that understands your industry and provides tailored questions and feedback</p>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg></div>
                        <h3 class="feature-title">Personalized Experience</h3>
                        <p class="feature-description">Every session is customized based on your CV, target role, and experience level</p>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="3" width="4" height="18"/></svg></div>
                        <h3 class="feature-title">Detailed Analytics</h3>
                        <p class="feature-description">Comprehensive feedback on your performance with actionable improvement suggestions</p>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
                        <h3 class="feature-title">Real-Time Practice</h3>
                        <p class="feature-description">Instant voice recognition and immediate feedback to accelerate your learning</p>
                    </div>
                </div>
            </div>

            <div class="about-section">
                <h2 class="section-title">My Story</h2>
                <div class="section-content">
                    <p>Good Chat was born from a simple observation: while technical skills can be learned from books and courses, interview skills require practice with real feedback. Too many talented individuals were missing opportunities not because they lacked ability, but because they struggled to communicate their value effectively.</p>
                    
                    <p>As a data analyst with a background in chemical and industrial engineering, I set out to solve this problem. I combined the latest advances in natural language processing with proven interview coaching methodologies to create a platform that's both accessible and highly effective.</p>
                    
                </div>
            </div>

            <div class="about-section">
                <h2 class="section-title">My Commitment</h2>
                <div class="section-content">
                    <p><strong>Privacy First:</strong> Your data is yours. I use industry-leading security measures to protect your information and never share your personal data without your explicit consent.</p>
                    
                    <p><strong>Continuous Improvement:</strong> I'm constantly updating my AI models and adding new features based on user feedback and the latest research in interview psychology and career development.</p>
                    
                    <p><strong>Accessible Pricing:</strong> I believe in fair, transparent pricing that provides value to job seekers at every career stage, from recent graduates to senior executives.</p>
                </div>
            </div>

            <div class="team-info">
                <h2 class="section-title">Join Thousands of Successful Professionals</h2>
                <p>Ready to transform your interview performance and land your dream job? Join the Good Chat community and take the first step toward career success.</p>
            </div>
        </div>
        `;
    }

    render() {
        // Remove any existing styles for this page
        const existingStyles = document.querySelectorAll('style');
        existingStyles.forEach(style => {
            if (style.textContent.includes('about-container')) {
                style.remove();
            }
        });

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

        // Add aggressive CSS override - only target about content, not global header
        const aggressiveStyle = document.createElement('style');
        aggressiveStyle.textContent = `
            .about-container .about-section h2,
            .about-container .about-section .section-title,
            .about-container .section-title,
            .about-section h2,
            .about-section .section-title,
            .about-section h2.section-title,
            div[class*="about"] h2 {
                color: #2d3748 !important;
                font-weight: 600 !important;
            }
            
            .about-container h3,
            .about-container .feature-title,
            .about-section h3,
            div[class*="about"] h3 {
                color: #2d3748 !important;
                font-weight: 600 !important;
            }
        `;
        document.head.appendChild(aggressiveStyle);

        // Force dark colors on about section headings only
        setTimeout(() => {
            // Target all h2 elements within the about content
            const allH2 = document.querySelectorAll('.about-container h2, .about-section h2');
            const allH3 = document.querySelectorAll('.about-container h3, .about-section h3');
            
            console.log('Found h2 elements:', allH2.length);
            console.log('Found h3 elements:', allH3.length);
            
            allH2.forEach((h2, index) => {
                // Only style if it's not the main "About Good Chat" title
                if (!h2.classList.contains('about-title')) {
                    console.log(`H2 ${index}:`, h2.textContent.substring(0, 50), 'Current color:', getComputedStyle(h2).color);
                    h2.style.color = '#2d3748';
                    h2.style.setProperty('color', '#2d3748', 'important');
                    h2.style.fontWeight = '700';
                }
            });
            
            allH3.forEach((h3, index) => {
                console.log(`H3 ${index}:`, h3.textContent.substring(0, 30), 'Current color:', getComputedStyle(h3).color);
                h3.style.color = '#2d3748';
                h3.style.setProperty('color', '#2d3748', 'important');
                h3.style.fontWeight = '600';
            });
            
            console.log('✅ Applied dark colors to', allH2.length, 'h2 elements and', allH3.length, 'h3 elements');
        }, 200);

        // Update page title
        document.title = 'About Us - Good Chat';
        
        // Add SPA page class to hide footer marketing sections
        document.body.classList.add('spa-page');
    }
}

// Make the class available globally
window.AboutPage = AboutPage;
