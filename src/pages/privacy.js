class PrivacyPage {
    constructor() {
        this.init();
    }

    init() {
        this.render();
    }

    getStyles() {
        return `
        .privacy-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            line-height: 1.6;
            color: #333;
        }

        .privacy-header {
            text-align: center;
            margin-bottom: 50px;
        }

        .privacy-title {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .privacy-subtitle {
            font-size: 1rem;
            color: #666;
            margin-bottom: 10px;
        }

        .last-updated {
            font-size: 0.9rem;
            color: #888;
            font-style: italic;
        }

        .privacy-section {
            margin-bottom: 40px;
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .section-title {
            font-size: 1.4rem;
            font-weight: 600;
            margin-bottom: 20px;
            color: #2d3748 !important;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 10px;
        }

        /* Force all section titles to be dark - same approach as terms and signup page */
        .privacy-container .privacy-section h2,
        .privacy-container .privacy-section .section-title,
        .privacy-container .section-title,
        .privacy-section h2,
        .privacy-section .section-title,
        .privacy-section h2.section-title,
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

        .section-content h4 {
            font-size: 1.1rem;
            font-weight: 600;
            margin: 25px 0 15px 0;
            color: #2d3748 !important;
        }

        .section-content ul {
            margin: 15px 0;
            padding-left: 25px;
        }

        .section-content li {
            margin-bottom: 8px;
        }

        .section-content p {
            margin-bottom: 15px;
        }

        .highlight-box {
            background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
            margin: 20px 0;
        }

        .contact-info {
            background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
            padding: 25px;
            border-radius: 8px;
            margin-top: 20px;
        }

        .contact-info h4 {
            margin-bottom: 15px !important;
            color: #2d3748 !important;
        }

        @media (max-width: 768px) {
            .privacy-container {
                padding: 20px 15px;
            }

            .privacy-title {
                font-size: 2rem;
            }

            .privacy-section {
                padding: 20px;
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

        .privacy-container {
            max-width: 900px;
            margin: 32px auto 50px;
            padding: 0 20px 10px;
        }

        .privacy-header {
            background: linear-gradient(135deg, #e0f2fe 0%, #fef9c3 55%, #dcfce7 100%);
            padding: 32px;
            border-radius: 26px;
            box-shadow: 0 18px 34px rgba(15, 23, 42, 0.12);
            border: 1px solid rgba(255, 255, 255, 0.9);
            margin-bottom: 32px;
        }

        .privacy-title {
            background: none;
            -webkit-text-fill-color: var(--ink);
            color: var(--ink);
            font-weight: 800;
        }

        .privacy-subtitle,
        .last-updated {
            color: var(--muted);
        }

        .privacy-section {
            background: var(--card);
            border-radius: 22px;
            border: 1px solid rgba(226, 232, 240, 0.7);
            box-shadow: var(--shadow);
        }

        .section-title {
            border-bottom: 1px solid rgba(226, 232, 240, 0.7);
            color: var(--ink) !important;
        }

        .section-content {
            color: var(--muted);
        }

        .section-content h4 {
            color: var(--ink) !important;
        }

        .highlight-box {
            background: linear-gradient(135deg, #fef9c3 0%, #ecfeff 100%);
            border-left: 4px solid #bae6fd;
            border-radius: 16px;
            border: 1px solid rgba(226, 232, 240, 0.7);
        }

        .contact-info {
            background: #ffffff;
            border-radius: 16px;
            border: 1px solid rgba(226, 232, 240, 0.7);
            box-shadow: 0 10px 18px rgba(15, 23, 42, 0.06);
        }
        `;
    }

    getHTML() {
        return `
        <div class="privacy-container">
            <div class="privacy-header">
                <h1 class="privacy-title">Privacy Policy</h1>
                <p class="privacy-subtitle">Your privacy is important to us. This policy explains how we collect, use, and protect your information.</p>
            </div>

            <div class="privacy-section">
                <h2 class="section-title">1. Information We Collect</h2>
                <div class="section-content">
                    <h4>Personal Information</h4>
                    <p>When you create an account with Good Chat, we collect:</p>
                    <ul>
                        <li>Name and email address</li>
                        <li>Account credentials (securely hashed passwords)</li>
                        <li>Profile information you choose to provide</li>
                    </ul>
                    
                    <h4>Professional Information</h4>
                    <p>To provide personalized interview coaching, we collect:</p>
                    <ul>
                        <li>CV/Resume content</li>
                        <li>Current role and experience level</li>
                        <li>Target job descriptions</li>
                        <li>Industry and career preferences</li>
                    </ul>
                    
                    <h4>Practice Session Data</h4>
                    <p>During your interview practice sessions, we collect:</p>
                    <ul>
                        <li>Audio recordings of your responses (temporarily processed)</li>
                        <li>Text transcriptions of your answers</li>
                        <li>Performance scores and feedback</li>
                        <li>Session duration and completion rates</li>
                    </ul>
                    
                    <h4>Technical Information</h4>
                    <p>We automatically collect certain technical information:</p>
                    <ul>
                        <li>IP address and browser information</li>
                        <li>Device type and operating system</li>
                        <li>Usage patterns and feature interactions</li>
                        <li>Error logs and performance metrics</li>
                    </ul>
                </div>
            </div>

            <div class="privacy-section">
                <h2 class="section-title">2. How We Use Your Information</h2>
                <div class="section-content">
                    <h4>Service Provision</h4>
                    <ul>
                        <li>Generate personalized interview questions based on your profile</li>
                        <li>Provide AI-powered feedback and scoring</li>
                        <li>Track your progress and improvement over time</li>
                        <li>Customize the difficulty and focus of practice sessions</li>
                    </ul>
                    
                    <h4>Account Management</h4>
                    <ul>
                        <li>Create and maintain your user account</li>
                        <li>Process payments and manage subscriptions</li>
                        <li>Provide customer support and respond to inquiries</li>
                        <li>Send important account and service updates</li>
                    </ul>
                    
                    <h4>Service Improvement</h4>
                    <ul>
                        <li>Analyze usage patterns to improve our AI models</li>
                        <li>Identify and fix bugs or technical issues</li>
                        <li>Develop new features based on user needs</li>
                        <li>Ensure the security and integrity of our platform</li>
                    </ul>
                    
                    <div class="highlight-box">
                        <strong>Important:</strong> We never sell your personal data to third parties. Your interview practice data is used solely to improve your experience and our service quality.
                    </div>
                </div>
            </div>

            <div class="privacy-section">
                <h2 class="section-title">3. Audio Data Processing</h2>
                <div class="section-content">
                    <h4>Voice Recording</h4>
                    <p>When you practice with voice responses:</p>
                    <ul>
                        <li>Audio is captured and processed in real-time</li>
                        <li>Speech is converted to text using AI transcription</li>
                        <li>Original audio recordings are automatically deleted after processing</li>
                        <li>Only text transcriptions are stored for your progress tracking</li>
                    </ul>
                    
                    <h4>Data Security</h4>
                    <p>All audio processing is done securely:</p>
                    <ul>
                        <li>Audio data is encrypted during transmission</li>
                        <li>Processing occurs on secure, dedicated servers</li>
                        <li>No audio data is shared with third-party services</li>
                        <li>We use industry-standard deletion protocols</li>
                    </ul>
                </div>
            </div>

            <div class="privacy-section">
                <h2 class="section-title">4. Data Sharing and Third Parties</h2>
                <div class="section-content">
                    <h4>Service Providers</h4>
                    <p>We work with trusted service providers who help us operate Good Chat:</p>
                    <ul>
                        <li><strong>OpenAI:</strong> For AI-powered question generation and feedback (text data only)</li>
                        <li><strong>Stripe:</strong> For secure payment processing</li>
                        <li><strong>Cloud Hosting:</strong> For secure data storage and application hosting</li>
                        <li><strong>Analytics:</strong> For anonymized usage statistics (no personal data)</li>
                    </ul>
                    
                    <h4>Legal Requirements</h4>
                    <p>We may disclose information if required by law or to:</p>
                    <ul>
                        <li>Comply with legal processes or government requests</li>
                        <li>Protect the rights and safety of Good Chat and our users</li>
                        <li>Prevent fraud or security breaches</li>
                        <li>Enforce our Terms of Service</li>
                    </ul>
                    
                    <div class="highlight-box">
                        <strong>No Sale of Data:</strong> We never sell, rent, or trade your personal information to marketers or other third parties.
                    </div>
                </div>
            </div>

            <div class="privacy-section">
                <h2 class="section-title">5. Your Privacy Rights</h2>
                <div class="section-content">
                    <p>Under data protection laws (including GDPR), you have the right to:</p>
                    
                    <h4>Access and Portability</h4>
                    <ul>
                        <li>Request a copy of all personal data we hold about you</li>
                        <li>Export your data in a machine-readable format</li>
                        <li>Transfer your data to another service provider</li>
                    </ul>
                    
                    <h4>Correction and Deletion</h4>
                    <ul>
                        <li>Update or correct inaccurate personal information</li>
                        <li>Delete your account and associated data</li>
                        <li>Request removal of specific data points</li>
                    </ul>
                    
                    <h4>Control and Objection</h4>
                    <ul>
                        <li>Object to certain processing activities</li>
                        <li>Restrict how we use your data</li>
                        <li>Withdraw consent for optional data processing</li>
                    </ul>
                    
                    <p>To exercise these rights, contact us at <strong>privacy@goodchat.co.uk</strong></p>
                </div>
            </div>

            <div class="privacy-section">
                <h2 class="section-title">6. Data Security</h2>
                <div class="section-content">
                    <h4>Technical Safeguards</h4>
                    <ul>
                        <li>End-to-end encryption for all data transmission</li>
                        <li>Secure database storage with access controls</li>
                        <li>Regular security audits and vulnerability assessments</li>
                        <li>Automated backup and disaster recovery systems</li>
                    </ul>
                    
                    <h4>Access Controls</h4>
                    <ul>
                        <li>Multi-factor authentication for all team accounts</li>
                        <li>Role-based access permissions</li>
                        <li>Regular access reviews and updates</li>
                        <li>Secure development and deployment practices</li>
                    </ul>
                    
                    <h4>Incident Response</h4>
                    <p>In the unlikely event of a data breach, we will:</p>
                    <ul>
                        <li>Notify affected users within 72 hours</li>
                        <li>Provide clear information about what happened</li>
                        <li>Take immediate steps to secure the breach</li>
                        <li>Work with authorities as required by law</li>
                    </ul>
                </div>
            </div>

            <div class="privacy-section">
                <h2 class="section-title">7. Data Retention</h2>
                <div class="section-content">
                    <h4>Account Data</h4>
                    <p>We retain your account information while your account is active and for a reasonable period after account closure to:</p>
                    <ul>
                        <li>Comply with legal obligations</li>
                        <li>Resolve disputes</li>
                        <li>Prevent fraud</li>
                        <li>Enforce our agreements</li>
                    </ul>
                    
                    <h4>Practice Session Data</h4>
                    <ul>
                        <li><strong>Audio recordings:</strong> Deleted immediately after transcription</li>
                        <li><strong>Text transcriptions:</strong> Retained for progress tracking</li>
                        <li><strong>Performance scores:</strong> Kept to show improvement over time</li>
                        <li><strong>Aggregated analytics:</strong> Retained indefinitely (anonymized)</li>
                    </ul>
                    
                    <h4>Deletion Requests</h4>
                    <p>You can request deletion of your data at any time. We will permanently delete your information within 30 days, except where retention is required by law.</p>
                </div>
            </div>

            <div class="privacy-section">
                <h2 class="section-title">8. Cookies and Tracking</h2>
                <div class="section-content">
                    <h4>Essential Cookies</h4>
                    <p>We use essential cookies that are necessary for the website to function:</p>
                    <ul>
                        <li>Authentication and session management</li>
                        <li>Security and fraud prevention</li>
                        <li>Basic functionality and user preferences</li>
                    </ul>
                    
                    <h4>Analytics</h4>
                    <p>We use anonymized analytics to understand how users interact with our service:</p>
                    <ul>
                        <li>Page views and user flows</li>
                        <li>Feature usage patterns</li>
                        <li>Performance metrics</li>
                        <li>Error tracking and debugging</li>
                    </ul>
                    
                    <p>You can control cookie preferences through your browser settings.</p>
                </div>
            </div>

            <div class="privacy-section">
                <h2 class="section-title">9. International Data Transfers</h2>
                <div class="section-content">
                    <p>Good Chat is based in the United Kingdom. Your data may be transferred to and processed in countries other than your own, including:</p>
                    <ul>
                        <li>United States (for cloud hosting and AI processing)</li>
                        <li>European Union (for backup and redundancy)</li>
                    </ul>
                    
                    <p>We ensure appropriate safeguards are in place for international transfers, including:</p>
                    <ul>
                        <li>Standard contractual clauses</li>
                        <li>Adequacy decisions</li>
                        <li>Certification schemes</li>
                    </ul>
                </div>
            </div>

            <div class="privacy-section">
                <h2 class="section-title">10. Children's Privacy</h2>
                <div class="section-content">
                    <p>Good Chat is not intended for children under 16 years of age. We do not knowingly collect personal information from children under 16.</p>
                    
                    <p>If we learn that we have collected personal information from a child under 16, we will delete that information immediately. If you believe we have collected information from a child, please contact us at privacy@goodchat.co.uk.</p>
                </div>
            </div>

            <div class="privacy-section">
                <h2 class="section-title">11. Changes to This Policy</h2>
                <div class="section-content">
                    <p>We may update this Privacy Policy from time to time to reflect changes in our practices or for legal reasons. When we make changes:</p>
                    <ul>
                        <li>We will post the updated policy on this page</li>
                        <li>For significant changes, we will notify you by email</li>
                        <li>Your continued use constitutes acceptance of the changes</li>
                    </ul>
                </div>
            </div>

            <div class="privacy-section">
                <h2 class="section-title">12. Contact Us</h2>
                <div class="section-content">
                    <p>If you have questions about this Privacy Policy or how we handle your data, please contact us:</p>
                    
                    <div class="contact-info">
                        <h4>Data Protection Contact</h4>
                        <p><strong>Email:</strong> privacy@goodchat.co.uk</p>
                        <p><strong>Subject Line:</strong> Privacy Policy Question</p>
                        <p><strong>Response Time:</strong> We respond to privacy inquiries within 48 hours</p>
                        
                        <h4>Data Protection Officer</h4>
                        <p>For GDPR-related inquiries, you can also contact our Data Protection Officer at dpo@goodchat.co.uk</p>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    render() {
        // Remove any existing styles for this page
        const existingStyles = document.querySelectorAll('style');
        existingStyles.forEach(style => {
            if (style.textContent.includes('privacy-container')) {
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

        // Add aggressive CSS override - only target privacy content, not global header
        const aggressiveStyle = document.createElement('style');
        aggressiveStyle.textContent = `
            .privacy-container .privacy-section h2,
            .privacy-container .privacy-section .section-title,
            .privacy-container .section-title,
            .privacy-section h2,
            .privacy-section .section-title,
            .privacy-section h2.section-title,
            div[class*="privacy"] h2 {
                color: #2d3748 !important;
                font-weight: 600 !important;
            }
            
            .privacy-container h4,
            .privacy-container .section-content h4,
            .privacy-section h4,
            div[class*="privacy"] h4 {
                color: #2d3748 !important;
                font-weight: 600 !important;
            }
        `;
        document.head.appendChild(aggressiveStyle);

        // Force dark colors on privacy section headings only
        setTimeout(() => {
            // Target all h2 elements within the privacy content
            const allH2 = document.querySelectorAll('.privacy-container h2, .privacy-section h2');
            const allH4 = document.querySelectorAll('.privacy-container h4, .privacy-section h4');
            
            console.log('Found h2 elements:', allH2.length);
            console.log('Found h4 elements:', allH4.length);
            
            allH2.forEach((h2, index) => {
                // Only style if it's not the main "Privacy Policy" title
                if (!h2.classList.contains('privacy-title')) {
                    console.log(`H2 ${index}:`, h2.textContent.substring(0, 50), 'Current color:', getComputedStyle(h2).color);
                    h2.style.color = '#2d3748';
                    h2.style.setProperty('color', '#2d3748', 'important');
                    h2.style.fontWeight = '700';
                }
            });
            
            allH4.forEach((h4, index) => {
                console.log(`H4 ${index}:`, h4.textContent.substring(0, 30), 'Current color:', getComputedStyle(h4).color);
                h4.style.color = '#2d3748';
                h4.style.setProperty('color', '#2d3748', 'important');
                h4.style.fontWeight = '600';
            });
            
            console.log('✅ Applied dark colors to', allH2.length, 'h2 elements and', allH4.length, 'h4 elements');
        }, 200);

        // Update page title
        document.title = 'Privacy Policy - Good Chat';
        
        // Add SPA page class to hide footer marketing sections
        document.body.classList.add('spa-page');
    }
}

// Make the class available globally
window.PrivacyPage = PrivacyPage;
