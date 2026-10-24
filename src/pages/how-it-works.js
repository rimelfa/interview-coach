// How It Works Page for SEO
window.HowItWorksPage = class HowItWorksPage {
    constructor() {
        console.log('HowItWorksPage constructor called');
    }

    async init(container) {
        console.log('HowItWorksPage init called');
        
        try {
            // Set page title and meta
            document.title = 'How Good Chat AI Interview Coach Works - Step by Step Guide';
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

            console.log('HowItWorksPage initialized successfully');
        } catch (error) {
            console.error('Error initializing how it works page:', error);
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
        metaDesc.content = 'Learn how Good Chat AI interview coaching works. Step-by-step guide to using our AI-powered platform for real-time interview practice, feedback, and performance improvement.';
        
        // Update keywords
        let metaKeywords = document.querySelector('meta[name="keywords"]');
        if (!metaKeywords) {
            metaKeywords = document.createElement('meta');
            metaKeywords.name = 'keywords';
            document.head.appendChild(metaKeywords);
        }
        metaKeywords.content = 'how it works, AI interview coaching, interview preparation process, step by step guide, interview practice workflow';
    }

    getHTML() {
        return `
            <div class="how-it-works-page">
                <div class="process-section">
                    <div class="container">
                        <h2>The Good Chat Process</h2>
                        <div class="process-steps">
                            <div class="step-item">
                                <div class="step-content">
                                    <h3>Setup Your Profile</h3>
                                    <p>Upload your CV and provide the job description you're preparing for. Our AI analyzes both to create personalized coaching tailored to your specific interview.</p>
                                    <div class="step-features">
                                        <span class="feature-tag">CV Analysis</span>
                                        <span class="feature-tag">Job Matching</span>
                                        <span class="feature-tag">Skill Assessment</span>
                                    </div>
                                </div>
                            </div>

                            <div class="step-item">
                                <div class="step-content">
                                    <h3>Start Your Practice Session</h3>
                                    <p>Begin a mock interview with our AI coach. Speak naturally as you would in a real interview - our system captures and analyzes your responses in real-time.</p>
                                    <div class="step-features">
                                        <span class="feature-tag">Voice Recognition</span>
                                        <span class="feature-tag">Real-time Analysis</span>
                                        <span class="feature-tag">Natural Conversation</span>
                                    </div>
                                </div>
                            </div>

                            <div class="step-item">
                                <div class="step-content">
                                    <h3>Get Instant AI Feedback</h3>
                                    <p>Receive immediate suggestions and improvements as you speak. Our AI identifies areas for enhancement and provides better response alternatives in real-time.</p>
                                    <div class="step-features">
                                        <span class="feature-tag">Live Coaching</span>
                                        <span class="feature-tag">Response Suggestions</span>
                                        <span class="feature-tag">Instant Feedback</span>
                                    </div>
                                </div>
                            </div>

                            <div class="step-item">
                                <div class="step-content">
                                    <h3>Track Your Progress</h3>
                                    <p>Review detailed performance analytics after each session. Monitor your improvement over time and focus on areas that need the most attention.</p>
                                    <div class="step-features">
                                        <span class="feature-tag">Performance Analytics</span>
                                        <span class="feature-tag">Progress Tracking</span>
                                        <span class="feature-tag">Improvement Plans</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="technology-section">
                    <div class="container">
                        <h2>Powered by Advanced AI Technology</h2>
                        <div class="tech-grid">
                            <div class="tech-item">
                                <div class="tech-icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg></div>
                                <h3>Speech Recognition</h3>
                                <p>Advanced voice processing technology captures and transcribes your speech with high accuracy, understanding context and meaning.</p>
                            </div>
                            <div class="tech-item">
                                <div class="tech-icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="2" x2="9" y2="4"/><line x1="15" y1="2" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="22"/><line x1="15" y1="20" x2="15" y2="22"/><line x1="20" y1="9" x2="22" y2="9"/><line x1="20" y1="15" x2="22" y2="15"/><line x1="2" y1="9" x2="4" y2="9"/><line x1="2" y1="15" x2="4" y2="15"/></svg></div>
                                <h3>Natural Language Processing</h3>
                                <p>Our AI understands the nuances of interview conversations, analyzing response quality, relevance, and communication effectiveness.</p>
                            </div>
                            <div class="tech-item">
                                <div class="tech-icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
                                <h3>Real-Time Analysis</h3>
                                <p>Lightning-fast processing provides instant feedback and suggestions without interrupting your natural conversation flow.</p>
                            </div>
                            <div class="tech-item">
                                <div class="tech-icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="3" width="4" height="18"/></svg></div>
                                <h3>Performance Analytics</h3>
                                <p>Comprehensive data analysis tracks your progress, identifies patterns, and provides actionable insights for improvement.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="workflow-section">
                    <div class="container">
                        <h2>What Happens During Your Session</h2>
                        <div class="workflow-content">
                            <div class="workflow-text">
                                <h3>Real-Time Interview Coaching</h3>
                                <ul class="workflow-list">
                                    <li>AI asks relevant interview questions based on your job description</li>
                                    <li>You respond naturally, speaking out loud as you would in a real interview</li>
                                    <li>Our system analyzes your response for content quality, confidence, and relevance</li>
                                    <li>Instant suggestions appear to help improve your answer</li>
                                    <li>You can retry questions or move on to practice different scenarios</li>
                                    <li>All interactions are recorded for later review and progress tracking</li>
                                </ul>
                                
                                <div class="workflow-benefits">
                                    <h4>Session Benefits:</h4>
                                    <div class="benefit-tags">
                                        <span class="benefit-tag">Build Confidence</span>
                                        <span class="benefit-tag">Improve Responses</span>
                                        <span class="benefit-tag">Reduce Anxiety</span>
                                        <span class="benefit-tag">Practice Anytime</span>
                                    </div>
                                </div>
                            </div>
                            <div class="workflow-visual">
                                <div class="workflow-demo">
                                    <div class="demo-screen">
                                        <div class="demo-header">Good Chat Session</div>
                                        <div class="demo-content">
                                            <div class="demo-question">"Tell me about a challenging project you worked on..."</div>
                                            <div class="demo-response">Speaking...</div>
                                            <div class="demo-suggestion">Consider mentioning specific metrics or outcomes</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="results-section">
                    <div class="container">
                        <h2>What You'll Achieve</h2>
                        <div class="results-grid">
                            <div class="result-card">
                                <div class="result-icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
                                <h3>Interview Readiness</h3>
                                <p>Feel confident and prepared for any interview question with practiced responses and improved communication skills.</p>
                            </div>
                            <div class="result-card">
                                <div class="result-icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></div>
                                <h3>Measurable Improvement</h3>
                                <p>Track your progress with detailed analytics showing improvement in response quality, confidence, and interview performance.</p>
                            </div>
                            <div class="result-card">
                                <div class="result-icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
                                <h3>Career Success</h3>
                                <p>Land your dream job with enhanced interview skills and the confidence to showcase your abilities effectively.</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        `;
    }

    injectStyles() {
        if (document.getElementById('how-it-works-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'how-it-works-styles';
        style.textContent = `
            .how-it-works-page {
                padding: 0;
                margin: 20px 0 0 0;
                background: #f8fafc;
                border-radius: 20px;
                overflow: hidden;
            }
            
            .process-section {
                padding: 80px 0;
                background: white;
            }
            
            .process-section h2 {
                text-align: center;
                font-size: 2.5rem;
                margin-bottom: 4rem;
                color: #2d3748;
            }
            
            .process-steps {
                max-width: 1000px;
                margin: 0 auto;
            }
            
            .step-item {
                display: flex;
                align-items: flex-start;
                gap: 2rem;
                margin-bottom: 4rem;
                padding: 2rem;
                background: #f7fafc;
                border-radius: 16px;
                border: 1px solid rgba(99, 102, 241, 0.25);
            }
            
            .step-number {
                background: #6366f1;
                color: white;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.5rem;
                font-weight: bold;
                flex-shrink: 0;
            }
            
            .step-content {
                text-align: center;
            }

            .how-it-works-page .tech-icon,
            .how-it-works-page .result-icon {
                display: flex;
                justify-content: center;
                margin-bottom: 1rem;
                opacity: 0.85;
            }
            
            .step-content h3 {
                font-size: 1.5rem;
                margin-bottom: 1rem;
                color: #2d3748;
            }
            
            .step-content p {
                color: #4a5568;
                line-height: 1.6;
                margin-bottom: 1rem;
            }
            
            .step-features {
                display: flex;
                gap: 0.5rem;
                flex-wrap: wrap;
                justify-content: center;
            }
            
            .feature-tag {
                background: #e0e7ff;
                color: #5b21b6;
                padding: 0.25rem 0.75rem;
                border-radius: 20px;
                font-size: 0.875rem;
                font-weight: 500;
            }
            
            .technology-section {
                padding: 80px 0;
                background: #f1f5f9;
            }
            
            .technology-section h2 {
                text-align: center;
                font-size: 2.5rem;
                margin-bottom: 3rem;
                color: #2d3748;
            }
            
            .tech-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 2rem;
                margin-top: 3rem;
            }
            
            .tech-item {
                background: white;
                padding: 2rem;
                border-radius: 12px;
                text-align: center;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            }
            
            .tech-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
            }
            
            .tech-item h3 {
                font-size: 1.3rem;
                margin-bottom: 1rem;
                color: #2d3748;
            }
            
            .tech-item p {
                color: #4a5568;
                line-height: 1.6;
            }
            
            .workflow-section {
                padding: 80px 0;
                background: #f1f5f9;
                border-radius: 20px;
                margin: 0 20px;
            }
            
            .workflow-section h2 {
                text-align: center;
                font-size: 2.5rem;
                margin-bottom: 3rem;
                color: #2d3748;
            }
            
            .workflow-content {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 4rem;
                align-items: center;
                max-width: 1200px;
                margin: 0 auto;
            }
            
            .workflow-text h3 {
                font-size: 1.8rem;
                margin-bottom: 1.5rem;
                color: #2d3748;
            }
            
            .workflow-list {
                list-style: none;
                padding: 0;
                margin-bottom: 2rem;
            }
            
            .workflow-list li {
                padding: 0.5rem 0;
                padding-left: 2rem;
                position: relative;
                color: #4a5568;
                line-height: 1.6;
            }
            
            .workflow-list li::before {
                content: "→";
                position: absolute;
                left: 0;
                color: #6366f1;
                font-weight: bold;
                font-size: 1.2rem;
            }
            
            .workflow-benefits h4 {
                color: #2d3748;
                margin-bottom: 1rem;
            }
            
            .benefit-tags {
                display: flex;
                gap: 0.5rem;
                flex-wrap: wrap;
            }
            
            .benefit-tag {
                background: #dcfce7;
                color: #166534;
                padding: 0.25rem 0.75rem;
                border-radius: 20px;
                font-size: 0.875rem;
                font-weight: 500;
            }
            
            .workflow-visual {
                display: flex;
                justify-content: center;
            }
            
            .workflow-demo {
                background: #1a202c;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 20px 25px rgba(0, 0, 0, 0.1);
                max-width: 400px;
                width: 100%;
            }
            
            .demo-screen {
                background: white;
                margin: 8px;
                border-radius: 8px;
                overflow: hidden;
            }
            
            .demo-header {
                background: #6366f1;
                color: white;
                padding: 1rem;
                text-align: center;
                font-weight: 600;
            }
            
            .demo-content {
                padding: 2rem;
            }
            
            .demo-question {
                background: #f3f4f6;
                padding: 1rem;
                border-radius: 8px;
                margin-bottom: 1rem;
                color: #374151;
                font-style: italic;
            }
            
            .demo-response {
                background: #fef3c7;
                color: #92400e;
                padding: 1rem;
                border-radius: 8px;
                margin-bottom: 1rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .demo-suggestion {
                background: #dbeafe;
                color: #1e40af;
                padding: 1rem;
                border-radius: 8px;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .results-section {
                padding: 80px 0;
                background: #f1f5f9;
            }
            
            .results-section h2 {
                text-align: center;
                font-size: 2.5rem;
                margin-bottom: 3rem;
                color: #2d3748;
            }
            
            .results-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 2rem;
                margin-top: 3rem;
            }
            
            .result-card {
                background: white;
                padding: 2rem;
                border-radius: 12px;
                text-align: center;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
                border: 1px solid transparent;
            }
            
            .result-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
            }
            
            .result-card h3 {
                font-size: 1.3rem;
                margin-bottom: 1rem;
                color: #2d3748;
            }
            
            .result-card p {
                color: #4a5568;
                line-height: 1.6;
            }
            
            
            @media (max-width: 768px) {
                .step-item {
                    flex-direction: column;
                    text-align: center;
                }
                
                .workflow-content {
                    grid-template-columns: 1fr;
                    gap: 3rem;
                }
                
                .tech-grid {
                    grid-template-columns: 1fr;
                }
                
                .results-grid {
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

            .how-it-works-page {
                background: transparent;
                border-radius: 0;
                margin-top: 24px;
            }

            .process-section,
            .technology-section,
            .workflow-section,
            .results-section {
                background: transparent;
                padding: 70px 0;
            }

            .process-section h2,
            .technology-section h2,
            .workflow-section h2,
            .results-section h2 {
                color: var(--ink);
                font-weight: 800;
            }

            .step-item,
            .tech-item,
            .result-card {
                background: var(--card);
                border-radius: 22px;
                border: 1px solid rgba(226, 232, 240, 0.7);
                box-shadow: var(--shadow);
            }

            .step-content h3,
            .tech-item h3,
            .workflow-text h3,
            .result-card h3 {
                color: var(--ink);
            }

            .step-content p,
            .tech-item p,
            .workflow-list li,
            .result-card p {
                color: var(--muted);
            }

            .feature-tag {
                background: linear-gradient(135deg, #bae6fd 0%, #a7f3d0 100%);
                color: #0f172a;
                border-radius: 999px;
                font-weight: 700;
            }

            .benefit-tag {
                background: #fef9c3;
                color: #7c2d12;
                border-radius: 999px;
                font-weight: 700;
            }

            .workflow-demo {
                background: linear-gradient(135deg, #e0f2fe 0%, #fef9c3 55%, #dcfce7 100%);
                border-radius: 22px;
                border: 1px solid rgba(255, 255, 255, 0.9);
            }

            .demo-screen {
                border-radius: 16px;
            }

            .demo-header {
                background: linear-gradient(135deg, #7dd3fc 0%, #86efac 100%);
                color: #0f172a;
            }

            .demo-question {
                background: #ffffff;
                border: 1px solid rgba(226, 232, 240, 0.7);
            }

            .demo-response {
                background: #fef9c3;
                color: #78350f;
            }

            .demo-suggestion {
                background: #e0f2fe;
                color: #0c4a6e;
            }
        `;
        
        document.head.appendChild(style);
    }
};
