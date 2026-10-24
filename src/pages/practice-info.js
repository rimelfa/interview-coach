// Practice Info Page for SEO
window.PracticeInfoPage = class PracticeInfoPage {
    constructor() {
        console.log('PracticeInfoPage constructor called');
    }

    async init(container) {
        console.log('PracticeInfoPage init called');
        
        try {
            // Set page title and meta
            document.title = 'AI-Powered Interview Practice - Good Chat';
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

            console.log('PracticeInfoPage initialized successfully');
        } catch (error) {
            console.error('Error initializing practice info page:', error);
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
        metaDesc.content = 'Practice interviews with AI-powered real-time coaching. Get instant feedback, suggested responses, and improve your interview skills with personalized practice sessions.';
        
        // Update keywords
        let metaKeywords = document.querySelector('meta[name="keywords"]');
        if (!metaKeywords) {
            metaKeywords = document.createElement('meta');
            metaKeywords.name = 'keywords';
            document.head.appendChild(metaKeywords);
        }
        metaKeywords.content = 'interview practice, AI coaching, mock interview, interview preparation, job interview tips, practice questions';
    }

    getHTML() {
        return `
            <div class="practice-info-page">

                <div class="benefits-section">
                    <div class="container">
                        <h2>Why Choose Good Chat for Interview Practice?</h2>
                        <div class="benefits-list">
                            <div class="benefit-item">
                                <div class="benefit-icon-svg"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M3 21v-1a8 8 0 0 1 16 0v1"/></svg></div>
                                <h3>Personalized Learning</h3>
                                <p>AI adapts to your unique background and interview style, providing tailored coaching for your specific needs</p>
                            </div>
                            <div class="benefit-item">
                                <div class="benefit-icon-svg"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
                                <h3>Time Efficient</h3>
                                <p>Practice anytime, anywhere - no need to coordinate with human mock interviewers</p>
                            </div>
                            <div class="benefit-item">
                                <div class="benefit-icon-svg"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
                                <h3>Private & Secure</h3>
                                <p>Practice in a safe environment without judgment, build confidence gradually</p>
                            </div>
                            <div class="benefit-item">
                                <div class="benefit-icon-svg"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></div>
                                <h3>Always Available</h3>
                                <p>24/7 access to interview practice sessions whenever you need to prepare</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="practice-types-section">
                    <div class="container">
                        <h2>Practice Different Interview Types</h2>
                        <div class="types-grid">
                            <div class="type-card">
                                <div class="type-icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
                                <h3>Behavioral Interviews</h3>
                                <p>Master the STAR method with situation-based questions that assess your past experiences and problem-solving skills.</p>
                                <ul class="type-features">
                                    <li>Leadership scenarios</li>
                                    <li>Conflict resolution</li>
                                    <li>Team collaboration</li>
                                    <li>Problem-solving examples</li>
                                </ul>
                            </div>
                            <div class="type-card">
                                <div class="type-icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></div>
                                <h3>Technical Interviews</h3>
                                <p>Practice coding challenges, system design, and technical problem-solving with real-time feedback and optimization suggestions.</p>
                                <ul class="type-features">
                                    <li>Algorithm challenges</li>
                                    <li>System architecture</li>
                                    <li>Code optimization</li>
                                    <li>Technical communication</li>
                                </ul>
                            </div>
                            <div class="type-card">
                                <div class="type-icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg></div>
                                <h3>Case Study Interviews</h3>
                                <p>Develop analytical thinking with business cases, consulting scenarios, and strategic problem-solving exercises.</p>
                                <ul class="type-features">
                                    <li>Business analysis</li>
                                    <li>Market sizing</li>
                                    <li>Strategic thinking</li>
                                    <li>Data interpretation</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="personalization-section">
                    <div class="container">
                        <h2>Personalized to Your Background</h2>
                        <div class="personalization-content">
                            <div class="personalization-text">
                                <h3>AI Analyzes Your Profile</h3>
                                <p>Upload your CV and job description to get questions tailored specifically to your experience level, industry, and target role.</p>
                                
                                <div class="personalization-features">
                                    <div class="feature-row">
                                        <div class="feature-icon-small"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></div>
                                        <div>
                                            <h4>CV Analysis</h4>
                                            <p>AI scans your resume to understand your background, skills, and career progression to generate relevant questions.</p>
                                        </div>
                                    </div>
                                    <div class="feature-row">
                                        <div class="feature-icon-small"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg></div>
                                        <div>
                                            <h4>Job Matching</h4>
                                            <p>Paste the job description and get questions specific to the role requirements, company culture, and responsibilities.</p>
                                        </div>
                                    </div>
                                    <div class="feature-row">
                                        <div class="feature-icon-small"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg></div>
                                        <div>
                                            <h4>Industry Focus</h4>
                                            <p>Questions adapted to your industry - tech, finance, healthcare, consulting, or any other field you're targeting.</p>
                                        </div>
                                    </div>
                                    <div class="feature-row">
                                        <div class="feature-icon-small"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></div>
                                        <div>
                                            <h4>Experience Level</h4>
                                            <p>Appropriate difficulty and expectations whether you're entry-level, mid-career, or senior executive level.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="personalization-visual">
                                <div class="personalization-demo">
                                    <div class="demo-upload">
                                        <div class="upload-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>
                                        <h4>Upload Your CV</h4>
                                        <p>Drag & drop or browse files</p>
                                    </div>
                                    <div class="demo-arrow">↓</div>
                                    <div class="demo-analysis">
                                        <div class="analysis-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="2" x2="9" y2="4"/><line x1="15" y1="2" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="22"/><line x1="15" y1="20" x2="15" y2="22"/><line x1="20" y1="9" x2="22" y2="9"/><line x1="20" y1="15" x2="22" y2="15"/><line x1="2" y1="9" x2="4" y2="9"/><line x1="2" y1="15" x2="4" y2="15"/></svg></div>
                                        <h4>AI Analysis</h4>
                                        <p>Extracting skills, experience & keywords</p>
                                    </div>
                                    <div class="demo-arrow">↓</div>
                                    <div class="demo-questions">
                                        <div class="questions-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
                                        <h4>Personalized Questions</h4>
                                        <p>Generated based on your profile</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="feedback-system-section">
                    <div class="container">
                        <h2>What You Get After Every Answer</h2>
                        <div class="feedback-grid">
                            <div class="feedback-card">
                                <div class="feedback-card-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
                                <h3>AI Content Feedback</h3>
                                <div class="feedback-details">
                                    <h4>Four sections, every time:</h4>
                                    <ul>
                                        <li><strong>Strengths:</strong> What worked well in your answer</li>
                                        <li><strong>Areas to Improve:</strong> Specific, actionable gaps</li>
                                        <li><strong>Model Answer:</strong> A strong example response side by side with yours</li>
                                        <li><strong>Interview Tips:</strong> Tactical advice for the question type</li>
                                    </ul>
                                </div>
                            </div>
                            <div class="feedback-card">
                                <div class="feedback-card-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
                                <h3>Delivery Analysis</h3>
                                <div class="feedback-details">
                                    <h4>Measured in real time as you speak:</h4>
                                    <ul>
                                        <li><strong>Speaking Pace:</strong> Words per minute with an Ideal / Too slow / Too fast rating</li>
                                        <li><strong>Filler Words:</strong> Exact count of "um," "uh," "like," "basically," and more — highlighted in your transcript</li>
                                        <li><strong>Pauses:</strong> Number of silences over 1.5 seconds and the longest pause detected</li>
                                        <li><strong>Confidence Score:</strong> Calculated from filler ratio and pause frequency — Low, Medium, or High</li>
                                        <li><strong>Annotated Transcript:</strong> Your answer colour-coded — red for fillers, yellow for vague words, green for strong phrases</li>
                                    </ul>
                                </div>
                            </div>
                            <div class="feedback-card">
                                <div class="feedback-card-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
                                <h3>Score & Progress</h3>
                                <div class="feedback-details">
                                    <h4>Track every session:</h4>
                                    <ul>
                                        <li><strong>Score out of 10:</strong> Instant rating on answer quality</li>
                                        <li><strong>Retry comparison:</strong> See if your second attempt improved</li>
                                        <li><strong>Session summary:</strong> Average score, best score, and average delivery stats across all questions</li>
                                        <li><strong>Dashboard trends:</strong> Pace, fillers, and pauses tracked over time so you can see genuine improvement</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="success-tips-section">
                    <div class="container">
                        <h2>Maximize Your Practice Sessions</h2>
                        <div class="tips-content">
                            <div class="tips-column">
                                <h3>Before You Start</h3>
                                <ul class="tips-list">
                                    <li>Find a quiet space with good audio quality</li>
                                    <li>Have your CV and job description ready</li>
                                    <li>Set aside 20-30 minutes for focused practice</li>
                                    <li>Prepare a glass of water to stay hydrated</li>
                                    <li>Sit up straight and maintain good posture</li>
                                </ul>
                            </div>
                            <div class="tips-column">
                                <h3>During Practice</h3>
                                <ul class="tips-list">
                                    <li>Speak naturally as if in a real interview</li>
                                    <li>Take your time to think before responding</li>
                                    <li>Use the STAR method for behavioral questions</li>
                                    <li>Be specific with examples and metrics</li>
                                    <li>Don't worry about mistakes, it's practice!</li>
                                </ul>
                            </div>
                            <div class="tips-column">
                                <h3>After Each Session</h3>
                                <ul class="tips-list">
                                    <li>Review your detailed feedback report</li>
                                    <li>Note areas marked for improvement</li>
                                    <li>Practice the suggested better responses</li>
                                    <li>Track your progress over time</li>
                                    <li>Schedule your next practice session</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        `;
    }

    injectStyles() {
        if (document.getElementById('practice-info-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'practice-info-styles';
        style.textContent = `
            .practice-info-page {
                padding: 0;
                margin: 20px 0 0 0;
                background: #f8fafc;
                border-radius: 20px;
                overflow: hidden;
            }
            
            .benefits-section, .practice-types-section, .personalization-section, .feedback-system-section, .success-tips-section {
                padding: 80px 0;
                background: white;
                min-height: auto;
            }
            
            .benefits-section h2, .practice-types-section h2, .personalization-section h2, .feedback-system-section h2, .success-tips-section h2 {
                text-align: center;
                font-size: 2.5rem;
                margin-bottom: 3rem;
                color: #2d3748;
            }
            
            
            .benefits-list {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 2rem;
                margin: 2rem auto 0;
                justify-content: center;
                max-width: 800px;
            }
            
            .benefit-item {
                text-align: center;
            }
            
            .benefit-item h3 {
                font-size: 1.2rem;
                margin-bottom: 0.5rem;
                color: #2d3748;
            }
            
            .benefit-item p {
                color: #4a5568;
                line-height: 1.6;
            }
            
            
            /* Practice Types Section */
            .types-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                gap: 2rem;
                margin-top: 3rem;
            }
            
            .type-card {
                background: #f7fafc;
                border-radius: 12px;
                padding: 2rem;
                border: 1px solid #e2e8f0;
                transition: transform 0.3s ease;
            }
            
            .type-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            }
            
            .benefit-icon-svg {
                display: flex;
                justify-content: center;
                margin-bottom: 0.75rem;
                opacity: 0.85;
            }

            .feedback-card-icon {
                margin-bottom: 0.75rem;
                opacity: 0.85;
            }

            .type-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
                text-align: center;
                display: flex;
                justify-content: center;
                opacity: 0.85;
            }
            
            .type-card h3 {
                font-size: 1.4rem;
                margin-bottom: 1rem;
                color: #2d3748;
                text-align: center;
            }
            
            .type-card p {
                color: #4a5568;
                line-height: 1.6;
                margin-bottom: 1.5rem;
                text-align: center;
            }
            
            .type-features {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .type-features li {
                color: #4a5568;
                margin-bottom: 0.5rem;
                padding-left: 1.5rem;
                position: relative;
            }
            
            .type-features li::before {
                content: "✓";
                position: absolute;
                left: 0;
                color: #48bb78;
                font-weight: bold;
            }
            
            /* Personalization Section */
            .personalization-content {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 4rem;
                align-items: center;
                max-width: 1200px;
                margin: 0 auto;
            }
            
            .personalization-text h3 {
                font-size: 1.8rem;
                margin-bottom: 1rem;
                color: #2d3748;
            }
            
            .personalization-text p {
                color: #4a5568;
                line-height: 1.6;
                margin-bottom: 2rem;
                font-size: 1.1rem;
            }
            
            .personalization-features {
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
            }
            
            .feature-row {
                display: flex;
                align-items: flex-start;
                gap: 1rem;
            }
            
            .feature-icon-small {
                font-size: 1.5rem;
                margin-top: 0.2rem;
                flex-shrink: 0;
            }
            
            .feature-row h4 {
                font-size: 1.1rem;
                margin: 0 0 0.5rem 0;
                color: #2d3748;
            }
            
            .feature-row p {
                margin: 0;
                color: #4a5568;
                line-height: 1.5;
            }
            
            .personalization-visual {
                display: flex;
                justify-content: center;
            }
            
            .personalization-demo {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1rem;
            }
            
            .demo-upload, .demo-analysis, .demo-questions {
                background: #f7fafc;
                border-radius: 12px;
                padding: 1.5rem;
                text-align: center;
                border: 1px solid #e2e8f0;
                min-width: 200px;
            }
            
            .upload-icon, .analysis-icon, .questions-icon {
                font-size: 2.5rem;
                margin-bottom: 0.5rem;
            }
            
            .demo-upload h4, .demo-analysis h4, .demo-questions h4 {
                font-size: 1.1rem;
                margin: 0 0 0.5rem 0;
                color: #2d3748;
            }
            
            .demo-upload p, .demo-analysis p, .demo-questions p {
                margin: 0;
                color: #4a5568;
                font-size: 0.9rem;
            }
            
            .demo-arrow {
                font-size: 1.5rem;
                color: #48bb78;
            }
            
            /* Feedback System Section */
            .feedback-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                gap: 2rem;
                margin-top: 3rem;
            }
            
            .feedback-card {
                background: #f7fafc;
                border-radius: 12px;
                padding: 2rem;
                border: 1px solid #e2e8f0;
            }
            
            .feedback-card h3 {
                font-size: 1.4rem;
                margin-bottom: 1.5rem;
                color: #2d3748;
                text-align: center;
            }
            
            .feedback-details h4 {
                font-size: 1.1rem;
                margin-bottom: 1rem;
                color: #2d3748;
            }
            
            .feedback-details ul {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .feedback-details li {
                color: #4a5568;
                margin-bottom: 0.75rem;
                line-height: 1.5;
                padding-left: 1rem;
                position: relative;
            }
            
            .feedback-details li::before {
                content: "→";
                position: absolute;
                left: 0;
                color: #48bb78;
            }
            
            .feedback-details strong {
                color: #2d3748;
            }
            
            /* Success Tips Section */
            .tips-content {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 3rem;
                margin-top: 3rem;
                max-width: 1200px;
                margin-left: auto;
                margin-right: auto;
            }
            
            .tips-column h3 {
                font-size: 1.4rem;
                margin-bottom: 1.5rem;
                color: #2d3748;
                text-align: center;
            }
            
            .tips-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .tips-list li {
                background: #f7fafc;
                padding: 1rem;
                margin-bottom: 0.75rem;
                border-radius: 8px;
                color: #4a5568;
                line-height: 1.5;
                border: 1px solid rgba(72, 187, 120, 0.35);
            }
            
            @media (max-width: 768px) {
                .practice-info-page .container {
                    padding: 0 15px;
                }
                
                .benefits-section, .practice-types-section, .personalization-section, .feedback-system-section, .success-tips-section {
                    padding: 60px 0;
                    min-height: auto;
                }
                
                .benefits-section {
                    padding: 40px 0 20px 0;
                }
                
                .practice-types-section {
                    padding-top: 40px;
                }
                
                .benefits-list {
                    margin: 1rem auto 0;
                    gap: 1rem;
                    max-width: 100%;
                }
                
                .benefit-item {
                    margin-bottom: 0;
                    padding: 0 10px;
                }
                
                .benefit-item h3 {
                    font-size: 1.1rem;
                    margin-bottom: 0.3rem;
                }
                
                .benefit-item p {
                    font-size: 0.95rem;
                }
                
                .features-grid {
                    grid-template-columns: 1fr;
                    gap: 1.5rem;
                    margin-top: 2rem;
                }
                
                .feature-card {
                    padding: 1.5rem;
                }
                
                .types-grid, .feedback-grid {
                    grid-template-columns: 1fr;
                }
                
                .personalization-content {
                    grid-template-columns: 1fr;
                    gap: 2rem;
                }
                
                .tips-content {
                    grid-template-columns: 1fr;
                    gap: 2rem;
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

            .practice-info-page {
                background: transparent;
                border-radius: 0;
                margin-top: 24px;
            }

            .benefits-section,
            .practice-types-section,
            .personalization-section,
            .feedback-system-section,
            .success-tips-section {
                background: transparent;
                padding: 70px 0;
            }

            .practice-info-page h2 {
                color: var(--ink);
                font-weight: 800;
            }

            .benefit-item h3,
            .type-card h3,
            .personalization-text h3,
            .feedback-card h3,
            .tips-column h3,
            .feature-row h4,
            .feedback-details h4 {
                color: var(--ink);
            }

            .benefit-item p,
            .type-card p,
            .personalization-text p,
            .feature-row p,
            .feedback-details li,
            .tips-list li {
                color: var(--muted);
            }

            .type-card,
            .feedback-card,
            .tips-list li,
            .demo-upload,
            .demo-analysis,
            .demo-questions {
                background: var(--card);
                border-radius: 22px;
                border: 1px solid rgba(226, 232, 240, 0.7);
                box-shadow: var(--shadow);
            }

            .type-features li::before,
            .feedback-details li::before {
                color: #38bdf8;
            }

            .demo-arrow {
                color: #38bdf8;
            }

            .benefit-item {
                background: var(--card);
                border-radius: 18px;
                border: 1px solid rgba(226, 232, 240, 0.7);
                box-shadow: var(--shadow);
                padding: 20px 18px;
            }
        `;
        
        document.head.appendChild(style);
    }
};
