// Features Page for SEO
window.FeaturesPage = class FeaturesPage {
    constructor() {
        console.log('FeaturesPage constructor called');
    }

    async init(container) {
        console.log('FeaturesPage init called');
        
        try {
            // Set page title and meta
            document.title = 'AI Interview Coaching Features - Good Chat';
            this.updateMeta();
            
            // Inject styles
            this.injectStyles();
            
            // Set page content
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
                // Hide content initially to prevent flicker
                contentArea.style.visibility = 'hidden';
                contentArea.innerHTML = this.getHTML();
                
                // Show content after a brief delay to ensure styles are applied
                setTimeout(() => {
                    contentArea.style.visibility = 'visible';
                }, 10);
            }

            console.log('FeaturesPage initialized successfully');
        } catch (error) {
            console.error('Error initializing features page:', error);
        }
    }

    updateMeta() {
        // Update meta description
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.name = 'description';
            document.head.appendChild(metaDesc);
        }
        metaDesc.content = 'Explore all AI-powered interview coaching features: real-time feedback, personalized suggestions, performance analytics, and more. Everything you need to ace your interviews.';
        
        // Update keywords
        let metaKeywords = document.querySelector('meta[name="keywords"]');
        if (!metaKeywords) {
            metaKeywords = document.createElement('meta');
            metaKeywords.name = 'keywords';
            document.head.appendChild(metaKeywords);
        }
        metaKeywords.content = 'AI interview features, interview coaching tools, real-time feedback, interview analytics, mock interview features, job interview preparation';
    }

    getHTML() {
        return `
            <div class="features-page">
                <div class="core-features-section">
                    <div class="container">
                        <h2>Core Features</h2>
                        <div class="features-grid">
                            <div class="feature-item">
                                <div class="feat-icon-svg">
                                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                                </div>
                                <h3>Real-Time Audio Processing</h3>
                                <p>Advanced speech recognition that captures and analyzes your responses instantly with 99% accuracy.</p>
                                <ul class="feature-details">
                                    <li>Multi-speaker detection</li>
                                    <li>Background noise filtering</li>
                                    <li>Cross-platform compatibility</li>
                                </ul>
                            </div>

                            <div class="feature-item">
                                <div class="feat-icon-svg">
                                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                                </div>
                                <h3>AI Response Analysis</h3>
                                <p>Intelligent analysis of your answers using advanced natural language processing and machine learning.</p>
                                <ul class="feature-details">
                                    <li>Content quality assessment</li>
                                    <li>Relevance scoring</li>
                                    <li>Communication effectiveness</li>
                                </ul>
                            </div>

                            <div class="feature-item">
                                <div class="feat-icon-svg">
                                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                                </div>
                                <h3>Smart Suggestions</h3>
                                <p>Context-aware response suggestions tailored to your background, role, and interview type.</p>
                                <ul class="feature-details">
                                    <li>Industry-specific recommendations</li>
                                    <li>STAR method guidance</li>
                                    <li>Behavioral question support</li>
                                </ul>
                            </div>

                            <div class="feature-item">
                                <div class="feat-icon-svg">
                                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                                </div>
                                <h3>Delivery Analysis</h3>
                                <p>After every voice answer, see your exact speaking pace, filler word count, pause count, and a confidence score — with an annotated transcript.</p>
                                <ul class="feature-details">
                                    <li>Words per minute with pace rating</li>
                                    <li>Exact filler word count (um, uh, like…)</li>
                                    <li>Pause count and longest pause duration</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="advanced-features-section">
                    <div class="container">
                        <h2>Advanced Coaching Tools</h2>
                        <div class="advanced-grid">
                            <div class="advanced-feature">
                                <div class="feature-header">
                                    <div class="adv-icon-svg">
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                    </div>
                                    <div>
                                        <h3>Personalized Coaching</h3>
                                        <p>AI adapts to your unique style and career goals</p>
                                    </div>
                                </div>
                                <div class="feature-content">
                                    <ul>
                                        <li><strong>CV Integration:</strong> Upload your CV for personalized question generation</li>
                                        <li><strong>Job Description Analysis:</strong> Tailor practice sessions to specific roles</li>
                                        <li><strong>Learning Path:</strong> Customized improvement roadmap based on your performance</li>
                                        <li><strong>Skill Assessment:</strong> Identify strengths and growth areas automatically</li>
                                    </ul>
                                </div>
                            </div>
                            
                            <div class="advanced-feature">
                                <div class="feature-header">
                                    <div class="adv-icon-svg">
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                    </div>
                                    <div>
                                        <h3>Real-Time Feedback</h3>
                                        <p>Instant coaching as you practice speaking</p>
                                    </div>
                                </div>
                                <div class="feature-content">
                                    <ul>
                                        <li><strong>Live Suggestions:</strong> Get response ideas while you're speaking</li>
                                        <li><strong>Confidence Boost:</strong> Real-time encouragement and guidance</li>
                                        <li><strong>Structure Help:</strong> Framework suggestions for better answers</li>
                                        <li><strong>Keyword Optimization:</strong> Industry-relevant terminology suggestions</li>
                                    </ul>
                                </div>
                            </div>
                            
                            <div class="advanced-feature">
                                <div class="feature-header">
                                    <div class="adv-icon-svg">
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                                    </div>
                                    <div>
                                        <h3>Delivery Trend Dashboard</h3>
                                        <p>Track how your speaking habits improve over time</p>
                                    </div>
                                </div>
                                <div class="feature-content">
                                    <ul>
                                        <li><strong>Pace Trend:</strong> Daily chart of your words per minute over the last 30 days</li>
                                        <li><strong>Filler Trend:</strong> See whether your filler word habit is improving session by session</li>
                                        <li><strong>Pause Trend:</strong> Track how often you pause and whether it's getting better</li>
                                        <li><strong>All-Time Averages:</strong> Summary chips showing your overall delivery baseline</li>
                                    </ul>
                                </div>
                            </div>
                            
                        </div>
                    </div>
                </div>

            </div>
        `;
    }

    injectStyles() {
        if (document.getElementById('features-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'features-styles';
        style.textContent = `
            .features-page {
                padding: 0;
                margin: 20px 0 0 0;
                background: #f8fafc;
                border-radius: 20px;
                overflow: hidden;
            }
            
            .core-features-section {
                padding: 80px 0;
                background: white;
            }
            
            .core-features-section h2 {
                text-align: center;
                font-size: 2.5rem;
                margin-bottom: 3rem;
                color: #2d3748;
            }
            
            .features-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 2rem;
            }
            
            .feature-item {
                background: #f7fafc;
                border-radius: 12px;
                padding: 2rem;
                border: 1px solid #e2e8f0;
                transition: transform 0.3s ease;
            }
            
            .feature-item:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            }
            
            .features-page .feature-icon {
                display: none;
            }

            .feat-icon-svg {
                margin-bottom: 1rem;
                opacity: 0.85;
            }

            .adv-icon-svg {
                flex-shrink: 0;
                opacity: 0.85;
            }
            
            .feature-item h3 {
                font-size: 1.3rem;
                margin-bottom: 1rem;
                color: #2d3748;
            }
            
            .feature-item p {
                color: #4a5568;
                line-height: 1.6;
                margin-bottom: 1rem;
            }
            
            .feature-details {
                list-style: none;
                padding: 0;
            }
            
            .feature-details li {
                color: #4a5568;
                margin-bottom: 0.5rem;
                padding-left: 1.5rem;
                position: relative;
                font-size: 0.9rem;
            }
            
            .feature-details li::before {
                content: "→";
                position: absolute;
                left: 0;
                color: #48bb78;
            }
            
            .advanced-features-section {
                padding: 80px 0;
                background: #f7fafc;
            }
            
            .advanced-features-section h2 {
                text-align: center;
                font-size: 2.5rem;
                margin-bottom: 3rem;
                color: #2d3748;
            }
            
            .advanced-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                gap: 2rem;
            }
            
            .advanced-feature {
                background: white;
                border-radius: 12px;
                padding: 2rem;
                border: 1px solid #e2e8f0;
            }
            
            .feature-header {
                display: flex;
                align-items: center;
                margin-bottom: 1.5rem;
                gap: 1rem;
            }
            
            .features-page .feature-icon-large,
            .features-page .feature-icon-large:empty {
                display: none;
            }
            
            .feature-header h3 {
                font-size: 1.4rem;
                margin: 0 0 0.5rem 0;
                color: #2d3748;
            }
            
            .feature-header p {
                margin: 0;
                color: #4a5568;
                font-size: 0.95rem;
            }
            
            .feature-content ul {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .feature-content li {
                color: #4a5568;
                margin-bottom: 0.75rem;
                line-height: 1.5;
            }
            
            .feature-content strong {
                color: #2d3748;
            }
            
            
            @media (max-width: 768px) {
                .features-grid, .advanced-grid {
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

            .features-page {
                background: transparent;
                border-radius: 0;
                margin-top: 24px;
            }

            .core-features-section,
            .advanced-features-section {
                background: transparent;
                padding: 70px 0;
            }

            .core-features-section h2,
            .advanced-features-section h2 {
                color: var(--ink);
                font-weight: 800;
            }

            .features-page .feature-item {
                background: var(--card);
                border-radius: 22px;
                border: 1px solid rgba(226, 232, 240, 0.7);
                box-shadow: var(--shadow);
            }

            .features-page .feature-item h3 {
                color: var(--ink);
            }

            .features-page .feature-item p,
            .features-page .feature-details li {
                color: var(--muted);
            }

            .features-page .feature-details li::before {
                color: #38bdf8;
            }

            .advanced-feature {
                background: var(--card);
                border-radius: 24px;
                border: 1px solid rgba(226, 232, 240, 0.7);
                box-shadow: var(--shadow);
            }

            .feature-header h3,
            .feature-content strong {
                color: var(--ink);
            }

            .feature-header p,
            .feature-content li {
                color: var(--muted);
            }
        `;
        
        document.head.appendChild(style);
    }
};
