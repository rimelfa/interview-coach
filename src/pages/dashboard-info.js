// Dashboard Info Page for SEO
window.DashboardInfoPage = class DashboardInfoPage {
    constructor() {
        console.log('DashboardInfoPage constructor called');
    }

    async init(container) {
        console.log('DashboardInfoPage init called');
        
        try {
            // Set page title and meta
            document.title = 'Interview Performance Dashboard - Good Chat';
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

            console.log('DashboardInfoPage initialized successfully');
        } catch (error) {
            console.error('Error initializing dashboard info page:', error);
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
        metaDesc.content = 'Track your interview performance with detailed analytics, progress insights, and personalized feedback reports. Monitor your improvement over time with Good Chat dashboard.';
        
        // Update keywords
        let metaKeywords = document.querySelector('meta[name="keywords"]');
        if (!metaKeywords) {
            metaKeywords = document.createElement('meta');
            metaKeywords.name = 'keywords';
            document.head.appendChild(metaKeywords);
        }
        metaKeywords.content = 'interview analytics, performance tracking, progress dashboard, interview feedback, skill assessment, interview metrics';
    }

    getHTML() {
        return `
            <div class="dashboard-info-page">
                <div class="dashboard-preview-section">
                    <div class="container">
                        <h2>What You'll See in Your Dashboard</h2>
                        <div class="preview-grid">
                            <div class="preview-card">
                                <div class="card-icon-svg">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="3" width="4" height="18"/></svg>
                                </div>
                                <h3>Score Trends</h3>
                                <p>A 30-day bar chart of your answer scores — color-coded by performance level so you can spot improvement at a glance.</p>
                            </div>
                            <div class="preview-card">
                                <div class="card-icon-svg">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                                </div>
                                <h3>Delivery Insights</h3>
                                <p>All-time averages for speaking pace (WPM), filler word count, and pause count across every voice answer you've recorded.</p>
                            </div>
                            <div class="preview-card">
                                <div class="card-icon-svg">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                                </div>
                                <h3>Delivery Trend Chart</h3>
                                <p>A daily trend chart with three toggle tabs — Pace, Fillers, and Pauses — showing how your delivery habits are changing over time.</p>
                            </div>
                            <div class="preview-card">
                                <div class="card-icon-svg">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                                </div>
                                <h3>Retry Analytics</h3>
                                <p>Before &amp; after score comparisons when you retry questions, with improvement deltas and your best single-retry gain.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="features-section">
                    <div class="container">
                        <h2>Dashboard Features</h2>
                        <div class="features-list">
                            <div class="feature-row">
                                <div class="feature-content">
                                    <h3>Delivery Trend Chart</h3>
                                    <p>Three toggle tabs let you switch between Pace (WPM), Filler Words, and Pauses to see how each delivery metric is trending day by day over the last 30 days.</p>
                                    <ul>
                                        <li>Speaking pace (words per minute) over time</li>
                                        <li>Filler word frequency per session</li>
                                        <li>Pause count trends</li>
                                        <li>Color-coded bars with trend direction label</li>
                                    </ul>
                                </div>
                            </div>

                            <div class="feature-row reverse">
                                <div class="feature-content">
                                    <h3>All-Time Delivery Averages</h3>
                                    <p>Summary chips at the top of the Delivery section give you your all-time averages at a glance — how fast you speak, how many fillers you use, and how often you pause.</p>
                                    <ul>
                                        <li>Average speaking pace (WPM) with rating label</li>
                                        <li>Average filler words per answer</li>
                                        <li>Average pauses per answer</li>
                                        <li>Total voice answers recorded</li>
                                    </ul>
                                </div>
                            </div>

                            <div class="feature-row">
                                <div class="feature-content">
                                    <h3>Score Performance Overview</h3>
                                    <p>Your overall stats at a glance — total sessions, questions answered, average score, and best score — alongside a 30-day bar chart of session scores.</p>
                                    <ul>
                                        <li>Average and best scores across all sessions</li>
                                        <li>Questions answered (unique + retries)</li>
                                        <li>Score breakdown by question type</li>
                                        <li>30-day improvement trend</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


                <div class="detailed-features-section">
                    <div class="container">
                        <h2>Detailed Performance Metrics</h2>
                        <div class="detailed-features-grid">
                            <div class="detailed-feature">
                                <div class="card-icon-svg">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="3" width="4" height="18"/></svg>
                                </div>
                                <h3>Score Tracking & Trends</h3>
                                <p>Visual progress charts showing your improvement over 30 days with interactive bar charts, color-coded performance levels, and date-based tracking.</p>
                            </div>

                            <div class="detailed-feature">
                                <div class="card-icon-svg">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                                </div>
                                <h3>Delivery Analytics</h3>
                                <p>Track speaking pace (WPM), filler word count, and pause frequency across every voice answer — with a daily trend chart and all-time averages.</p>
                            </div>

                            <div class="detailed-feature">
                                <div class="card-icon-svg">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                </div>
                                <h3>Question Type Breakdown</h3>
                                <p>Performance analysis across 20+ interview question categories including behavioral, technical, situational, and leadership with individual scoring.</p>
                            </div>

                            <div class="detailed-feature">
                                <div class="card-icon-svg">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                                </div>
                                <h3>Retry Analytics</h3>
                                <p>Before &amp; after comparisons showing score improvements when you retry questions, with success rate tracking and your best single-retry gain.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="retry-analysis-section">
                    <div class="container">
                        <h2>Advanced Retry Analysis</h2>
                        <div class="retry-features">
                            <div class="retry-feature-main">
                                <h3>Before & After Comparisons</h3>
                                <p>See exactly how much you improve when you retry questions. Our advanced analytics track your original attempts versus retries, showing detailed score changes and improvement patterns.</p>
                                
                                <div class="retry-demo">
                                    <div class="retry-demo-item">
                                        <div class="demo-score original">
                                            <div class="score-number">6.2</div>
                                            <div class="score-label">Original</div>
                                        </div>
                                        <div class="demo-arrow">→</div>
                                        <div class="demo-score retry">
                                            <div class="score-number">8.1</div>
                                            <div class="score-label">Retry</div>
                                        </div>
                                        <div class="demo-improvement">
                                            <div class="improvement-indicator positive">+1.9</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="retry-insights">
                                <h3>Retry Insights</h3>
                                <div class="insights-grid">
                                    <div class="insight-card">
                                        <h4>Success Rate Tracking</h4>
                                        <p>Percentage of retries that resulted in better scores</p>
                                    </div>
                                    <div class="insight-card">
                                        <h4>Time Gap Analysis</h4>
                                        <p>How much time between attempts affects improvement</p>
                                    </div>
                                    <div class="insight-card">
                                        <h4>Best Improvement</h4>
                                        <p>Your largest score improvement in a single retry</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="session-analytics-section">
                    <div class="container">
                        <h2>Session Analytics</h2>
                        <div class="session-analytics-grid">
                            <div class="session-card">
                                <h3>Total Sessions</h3>
                                <p>Complete count of all your practice sessions automatically saved and tracked in your dashboard.</p>
                            </div>
                            <div class="session-card">
                                <h3>Questions Answered</h3>
                                <p>Total questions including retries and unique questions with comprehensive performance statistics.</p>
                            </div>
                            <div class="session-card">
                                <h3>Performance Scores</h3>
                                <p>Average and best scores across all sessions with detailed breakdowns by question type.</p>
                            </div>
                            <div class="session-card">
                                <h3>Improvement Tracking</h3>
                                <p>Advanced algorithms calculate your improvement rate over time, showing progress trends and patterns.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="tech-specs-section">
                    <div class="container">
                        <h2>Technical Features</h2>
                        <div class="tech-specs">
                            <div class="tech-spec-group">
                                <h3>Authentication & Security</h3>
                                <ul class="tech-list">
                                    <li>Secure JWT token-based authentication</li>
                                    <li>Automatic session management</li>
                                    <li>Data privacy protection</li>
                                    <li>Secure API endpoints</li>
                                </ul>
                            </div>
                            
                            <div class="tech-spec-group">
                                <h3>Data Analytics</h3>
                                <ul class="tech-list">
                                    <li>Real-time score calculation</li>
                                    <li>Dynamic chart generation</li>
                                    <li>Performance trend analysis</li>
                                    <li>Statistical improvement algorithms</li>
                                </ul>
                            </div>
                            
                            <div class="tech-spec-group">
                                <h3>Data Management</h3>
                                <ul class="tech-list">
                                    <li>Automatic progress saving</li>
                                    <li>Session history preservation</li>
                                    <li>Cross-device synchronization</li>
                                    <li>Backup and recovery systems</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        `;
    }

    injectStyles() {
        if (document.getElementById('dashboard-info-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'dashboard-info-styles';
        style.textContent = `
            .dashboard-info-page {
                padding: 0;
                margin: 20px 0 0 0;
                background: #f8fafc;
                border-radius: 20px;
                overflow: hidden;
            }
            
            .dashboard-info-page .container {
                padding: 0 20px;
            }
            
            .dashboard-preview-section, .features-section, .detailed-features-section, .retry-analysis-section, .session-analytics-section, .tech-specs-section {
                padding: 80px 0;
                background: white;
            }
            
            .dashboard-preview-section h2, .features-section h2, .detailed-features-section h2, .retry-analysis-section h2, .session-analytics-section h2, .tech-specs-section h2 {
                text-align: center;
                font-size: 2.5rem;
                margin-bottom: 3rem;
                color: #2d3748;
            }
            
            .preview-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 2rem;
                margin-top: 3rem;
            }
            
            .preview-card {
                background: #f7fafc;
                border-radius: 12px;
                padding: 2rem;
                text-align: center;
                border: 1px solid #e2e8f0;
                transition: transform 0.3s ease;
            }
            
            .preview-card:hover {
                transform: translateY(-5px);
            }
            
            .card-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
            }

            .card-icon-svg {
                display: flex;
                justify-content: center;
                margin-bottom: 1rem;
                opacity: 0.85;
            }
            
            .preview-card h3 {
                font-size: 1.3rem;
                margin-bottom: 1rem;
                color: #2d3748;
            }
            
            .preview-card p {
                color: #4a5568;
                line-height: 1.6;
            }
            
            .features-list {
                max-width: 1000px;
                margin: 0 auto;
            }
            
            .feature-row {
                display: grid;
                grid-template-columns: 2fr 1fr;
                gap: 3rem;
                align-items: center;
                margin-bottom: 4rem;
            }
            
            .feature-row.reverse {
                grid-template-columns: 1fr 2fr;
            }
            
            .feature-row.reverse .feature-content {
                order: 2;
            }
            
            .feature-row.reverse .feature-visual {
                order: 1;
            }
            
            .feature-content h3 {
                font-size: 1.8rem;
                margin-bottom: 1rem;
                color: #2d3748;
            }
            
            .feature-content p {
                color: #4a5568;
                line-height: 1.6;
                margin-bottom: 1rem;
            }
            
            .feature-content ul {
                list-style: none;
                padding: 0;
            }
            
            .feature-content li {
                color: #4a5568;
                margin-bottom: 0.5rem;
                padding-left: 1.5rem;
                position: relative;
            }
            
            .feature-content li::before {
                content: '';
                position: absolute;
                left: 0;
                width: 6px;
                height: 6px;
                background: #10b981;
                border-radius: 50%;
                top: 50%;
                transform: translateY(-50%);
            }
            
            .feature-visual {
                font-size: 8rem;
                text-align: center;
                opacity: 0.3;
            }
            
            
            @media (max-width: 768px) {
                .feature-row, .feature-row.reverse {
                    grid-template-columns: 1fr;
                    text-align: center;
                }
                
                .feature-row.reverse .feature-content,
                .feature-row.reverse .feature-visual {
                    order: unset;
                }
                
                .preview-grid {
                    grid-template-columns: 1fr;
                }
                
                
                .detailed-features-grid {
                    grid-template-columns: 1fr;
                    gap: 2rem;
                }
                
                .retry-features {
                    gap: 2rem;
                }
                
                .session-analytics-grid {
                    grid-template-columns: 1fr;
                }
                
                .tech-specs {
                    grid-template-columns: 1fr;
                    gap: 1.5rem;
                }
                
                .retry-demo-item {
                    flex-direction: column;
                    gap: 1rem;
                    text-align: center;
                }
                
                .demo-arrow {
                    transform: rotate(90deg);
                }
                
                .insights-grid {
                    grid-template-columns: 1fr;
                }
                
                .detailed-features-section, .retry-analysis-section, .session-analytics-section, .tech-specs-section {
                    padding: 60px 0;
                }
                
                .detailed-features-section h2, .retry-analysis-section h2, .session-analytics-section h2, .tech-specs-section h2 {
                    font-size: 2rem;
                    margin-bottom: 2rem;
                }
                
                .feature-icon-large {
                    font-size: 2.5rem;
                }
                
                .tech-spec-group {
                    padding: 1.5rem;
                }
                
                .tech-spec-group h3 {
                    font-size: 1.2rem;
                    text-align: center;
                    margin-bottom: 1rem;
                }
                
            }
            
            /* Detailed Features Section - Matching preview cards */
            .detailed-features-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 2rem;
                margin-top: 3rem;
            }
            
            .detailed-feature {
                background: #f7fafc;
                border-radius: 12px;
                padding: 2rem;
                text-align: center;
                border: 1px solid #e2e8f0;
                transition: transform 0.3s ease;
            }
            
            .detailed-feature:hover {
                transform: translateY(-5px);
            }
            
            .feature-icon-large {
                font-size: 3rem;
                margin-bottom: 1rem;
            }
            
            .detailed-feature h3 {
                font-size: 1.3rem;
                margin-bottom: 1rem;
                color: #2d3748;
            }
            
            .detailed-feature p {
                color: #4a5568;
                line-height: 1.6;
            }
            
            /* Retry Analysis Section */
            .retry-features {
                display: flex;
                flex-direction: column;
                gap: 3rem;
            }
            
            .retry-feature-main h3 {
                font-size: 1.8rem;
                margin-bottom: 1rem;
                color: #2d3748;
            }
            
            .retry-feature-main p {
                color: #4a5568;
                line-height: 1.6;
                margin-bottom: 2rem;
                font-size: 1.1rem;
            }
            
            .retry-demo {
                background: #f7fafc;
                border-radius: 12px;
                padding: 2rem;
                border: 1px solid #e2e8f0;
            }
            
            .retry-demo-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 1rem;
            }
            
            .demo-score {
                background: white;
                border-radius: 8px;
                padding: 1rem;
                text-align: center;
                border: 1px solid #e2e8f0;
            }
            
            .demo-score.original .score-number {
                color: #718096;
                font-size: 1.5rem;
                font-weight: bold;
                margin-bottom: 0.5rem;
            }
            
            .demo-score.retry .score-number {
                color: #48bb78;
                font-size: 1.5rem;
                font-weight: bold;
                margin-bottom: 0.5rem;
            }
            
            .score-label {
                font-size: 0.8rem;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                font-weight: 600;
                color: #4a5568;
            }
            
            .demo-arrow {
                font-size: 1.5rem;
                color: #4a5568;
            }
            
            .demo-improvement .improvement-indicator.positive {
                background: #c6f6d5;
                color: #22543d;
                padding: 0.5rem 1rem;
                border-radius: 6px;
                font-weight: bold;
            }
            
            .retry-insights h3 {
                font-size: 1.4rem;
                margin-bottom: 1.5rem;
                color: #2d3748;
            }
            
            .insights-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 2rem;
            }
            
            .insight-card {
                background: white;
                border-radius: 8px;
                padding: 1.5rem;
                border: 1px solid #e2e8f0;
                text-align: center;
            }
            
            .insight-icon {
                font-size: 1.5rem;
                margin-bottom: 0.5rem;
            }
            
            .insight-card h4 {
                font-size: 0.95rem;
                margin: 0 0 0.5rem 0;
                color: #2d3748;
                font-weight: 600;
            }
            
            .insight-card p {
                margin: 0;
                color: #4a5568;
                font-size: 0.85rem;
                line-height: 1.4;
            }
            
            /* Session Analytics Section - Matching preview cards */
            .session-analytics-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 2rem;
                margin-top: 3rem;
            }
            
            .session-card {
                background: #f7fafc;
                border-radius: 12px;
                padding: 2rem;
                text-align: center;
                border: 1px solid #e2e8f0;
                transition: transform 0.3s ease;
            }
            
            .session-card:hover {
                transform: translateY(-5px);
            }
            
            .session-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
            }
            
            .session-card h3 {
                font-size: 1.3rem;
                margin-bottom: 1rem;
                color: #2d3748;
            }
            
            .session-card p {
                color: #4a5568;
                line-height: 1.6;
            }
            
            /* Tech Specs Section */
            .tech-specs {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 2rem;
                margin-top: 3rem;
            }
            
            .tech-spec-group {
                background: #f7fafc;
                border-radius: 12px;
                padding: 2rem;
                border: 1px solid #e2e8f0;
            }
            
            .tech-spec-group h3 {
                font-size: 1.4rem;
                margin-bottom: 1.5rem;
                color: #2d3748;
            }
            
            .tech-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .tech-list li {
                color: #4a5568;
                margin-bottom: 0.75rem;
                line-height: 1.5;
                padding-left: 1.5rem;
                position: relative;
            }
            
            .tech-list li::before {
                content: '';
                position: absolute;
                left: 0;
                width: 6px;
                height: 6px;
                background: #10b981;
                border-radius: 50%;
                top: 50%;
                transform: translateY(-50%);
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

            .dashboard-info-page {
                background: transparent;
                border-radius: 0;
                margin-top: 24px;
            }

            .dashboard-preview-section,
            .features-section,
            .detailed-features-section,
            .retry-analysis-section,
            .session-analytics-section,
            .tech-specs-section {
                background: transparent;
                padding: 70px 0;
            }

            .dashboard-info-page h2 {
                color: var(--ink);
                font-weight: 800;
            }

            .preview-card,
            .detailed-feature,
            .session-card,
            .tech-spec-group,
            .retry-demo,
            .insight-card {
                background: var(--card);
                border-radius: 22px;
                border: 1px solid rgba(226, 232, 240, 0.7);
                box-shadow: var(--shadow);
            }

            .preview-card h3,
            .detailed-feature h3,
            .session-card h3,
            .tech-spec-group h3,
            .retry-feature-main h3,
            .retry-insights h3,
            .insight-card h4,
            .feature-content h3 {
                color: var(--ink);
            }

            .preview-card p,
            .detailed-feature p,
            .session-card p,
            .feature-content p,
            .feature-content li,
            .tech-list li,
            .insight-card p,
            .score-label,
            .demo-arrow {
                color: var(--muted);
            }

            .feature-content li::before,
            .tech-list li::before {
                background: #38bdf8;
            }

            .demo-score {
                border-radius: 18px;
                border: 1px solid rgba(226, 232, 240, 0.7);
            }

            .demo-score.retry .score-number {
                color: #0ea5e9;
            }

            .demo-improvement .improvement-indicator.positive {
                background: rgba(134, 239, 172, 0.45);
                color: #14532d;
            }
        `;
        
        document.head.appendChild(style);
    }
};
