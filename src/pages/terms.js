class TermsPage {
    constructor() {
        this.init();
    }

    init() {
        this.render();
    }

    getStyles() {
        return `
        .terms-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            line-height: 1.6;
            color: #333;
        }

        .terms-header {
            text-align: center;
            margin-bottom: 50px;
        }

        .terms-title {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .terms-subtitle {
            font-size: 1rem;
            color: #666;
            margin-bottom: 10px;
        }

        .last-updated {
            font-size: 0.9rem;
            color: #888;
            font-style: italic;
        }

        .terms-section {
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

        /* Force all section titles to be dark - same approach as signup page */
        .terms-container .terms-section h2,
        .terms-container .terms-section .section-title,
        .terms-container .section-title,
        .terms-section h2,
        .terms-section .section-title,
        .terms-section h2.section-title,
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
            .terms-container {
                padding: 20px 15px;
            }

            .terms-title {
                font-size: 2rem;
            }

            .terms-section {
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

        .terms-container {
            max-width: 900px;
            margin: 32px auto 50px;
            padding: 0 20px 10px;
        }

        .terms-header {
            background: linear-gradient(135deg, #e0f2fe 0%, #fef9c3 55%, #dcfce7 100%);
            padding: 32px;
            border-radius: 26px;
            box-shadow: 0 18px 34px rgba(15, 23, 42, 0.12);
            border: 1px solid rgba(255, 255, 255, 0.9);
            margin-bottom: 32px;
        }

        .terms-title {
            background: none;
            -webkit-text-fill-color: var(--ink);
            color: var(--ink);
            font-weight: 800;
        }

        .terms-subtitle,
        .last-updated {
            color: var(--muted);
        }

        .terms-section {
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
        <div class="terms-container">
            <div class="terms-header">
                <h1 class="terms-title">Terms of Service</h1>
                <p class="terms-subtitle">Please read these terms carefully before using Good Chat</p>
            </div>

            <div class="terms-section">
                <h2 class="section-title" style="color: #000000 !important;">1. Acceptance of Terms</h2>
                <div class="section-content">
                    <p>By accessing and using Good Chat ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.</p>
                    
                    <p>These Terms of Service ("Terms") govern your use of our website and services provided by Good Chat. These Terms apply to all visitors, users, and others who access or use the Service.</p>
                </div>
            </div>

            <div class="terms-section">
                <h2 class="section-title" style="color: #000000 !important;">2. Description of Service</h2>
                <div class="section-content">
                    <p>Good Chat is an AI-powered interview coaching platform that provides:</p>
                    <ul>
                        <li>Personalized interview practice sessions</li>
                        <li>Real-time feedback and scoring</li>
                        <li>Progress tracking and analytics</li>
                        <li>Industry-specific question sets</li>
                        <li>Voice and text-based analysis</li>
                    </ul>
                    
                    <p>The Service uses artificial intelligence to analyze your responses and provide feedback. While we strive for accuracy, the AI-generated feedback is for educational purposes and should not be considered as professional career advice.</p>
                </div>
            </div>

            <div class="terms-section">
                <h2 class="section-title" style="color: #000000 !important;">3. User Accounts and Registration</h2>
                <div class="section-content">
                    <h4 style="color: #000000 !important;">Account Creation</h4>
                    <p>To use certain features of the Service, you must register for an account. You agree to:</p>
                    <ul>
                        <li>Provide accurate, current, and complete information</li>
                        <li>Maintain and update your information</li>
                        <li>Keep your password secure and confidential</li>
                        <li>Accept responsibility for all activities under your account</li>
                    </ul>
                    
                    <h4 style="color: #000000 !important;">Account Termination</h4>
                    <p>We reserve the right to terminate or suspend your account at any time for violation of these Terms or for any other reason we deem appropriate.</p>
                </div>
            </div>

            <div class="terms-section">
                <h2 class="section-title" style="color: #000000 !important;">4. Payment and Subscriptions</h2>
                <div class="section-content">
                    <h4 style="color: #000000 !important;">Pricing</h4>
                    <p>Good Chat operates on a pay-per-use model:</p>
                    <ul>
                        <li>£6.99 for 50 questions per month</li>
                        <li>£10.99 for 100 questions per month</li>
                    </ul>
                    
                    <h4 style="color: #000000 !important;">Payment Terms</h4>
                    <ul>
                        <li>All payments are processed securely through Stripe</li>
                        <li>Payments are one-time purchases, not recurring subscriptions</li>
                        <li>Question credits expire at the end of each month</li>
                        <li>Unused credits do not roll over to the following month</li>
                    </ul>
                    
                    <h4 style="color: #000000 !important;">Refunds</h4>
                    <p>We offer refunds within 7 days of purchase if you have used less than 10% of your purchased questions. Refund requests must be submitted through our contact form.</p>
                </div>
            </div>

            <div class="terms-section">
                <h2 class="section-title" style="color: #000000 !important;">5. User Content and Data</h2>
                <div class="section-content">
                    <h4 style="color: #000000 !important;">Your Content</h4>
                    <p>You retain ownership of any content you provide to the Service, including:</p>
                    <ul>
                        <li>CV/Resume information</li>
                        <li>Interview responses</li>
                        <li>Profile information</li>
                        <li>Practice session data</li>
                    </ul>
                    
                    <h4 style="color: #000000 !important;">Use of Your Data</h4>
                    <p>By using the Service, you grant us permission to:</p>
                    <ul>
                        <li>Process your data to provide personalized feedback</li>
                        <li>Analyze anonymized usage patterns to improve our Service</li>
                        <li>Store your practice sessions for progress tracking</li>
                    </ul>
                    
                    <p>We do not sell, rent, or share your personal data with third parties without your explicit consent.</p>
                </div>
            </div>

            <div class="terms-section">
                <h2 class="section-title" style="color: #000000 !important;">6. Prohibited Uses</h2>
                <div class="section-content">
                    <p>You agree not to use the Service to:</p>
                    <ul>
                        <li>Violate any laws or regulations</li>
                        <li>Share false, misleading, or harmful information</li>
                        <li>Attempt to reverse engineer or extract our AI models</li>
                        <li>Use automated tools to access the Service</li>
                        <li>Share your account credentials with others</li>
                        <li>Use the Service for any commercial purpose without authorization</li>
                        <li>Interfere with or disrupt the Service</li>
                    </ul>
                </div>
            </div>

            <div class="terms-section">
                <h2 class="section-title" style="color: #000000 !important;">7. Intellectual Property</h2>
                <div class="section-content">
                    <p>The Service and its original content, features, and functionality are owned by Good Chat and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.</p>
                    
                    <p>You may not copy, modify, distribute, sell, or lease any part of our Service or included software without our written permission.</p>
                </div>
            </div>

            <div class="terms-section">
                <h2 class="section-title" style="color: #000000 !important;">8. Privacy and Data Protection</h2>
                <div class="section-content">
                    <p>Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference.</p>
                    
                    <p>We comply with applicable data protection laws, including GDPR for European users. You have the right to:</p>
                    <ul>
                        <li>Access your personal data</li>
                        <li>Correct inaccurate data</li>
                        <li>Delete your data</li>
                        <li>Port your data to another service</li>
                        <li>Object to certain processing activities</li>
                    </ul>
                </div>
            </div>

            <div class="terms-section">
                <h2 class="section-title" style="color: #000000 !important;">9. Disclaimers and Limitation of Liability</h2>
                <div class="section-content">
                    <h4 style="color: #000000 !important;">Service Availability</h4>
                    <p>We strive to maintain high uptime but do not guarantee uninterrupted access to the Service. We may suspend the Service for maintenance, updates, or other operational reasons.</p>
                    
                    <h4 style="color: #000000 !important;">AI Accuracy</h4>
                    <p>While our AI provides valuable feedback, it is not infallible. The feedback is for educational purposes and should be used in conjunction with other preparation methods.</p>
                    
                    <h4 style="color: #000000 !important;">Limitation of Liability</h4>
                    <p>To the fullest extent permitted by law, Good Chat shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.</p>
                </div>
            </div>

            <div class="terms-section">
                <h2 class="section-title" style="color: #000000 !important;">10. Changes to Terms</h2>
                <div class="section-content">
                    <p>We reserve the right to update these Terms at any time. When we do, we will post the updated Terms on this page.</p>
                    
                    <p>Your continued use of the Service after any changes constitutes acceptance of the new Terms. We encourage you to review these Terms periodically.</p>
                </div>
            </div>

            <div class="terms-section">
                <h2 class="section-title" style="color: #000000 !important;">11. Governing Law</h2>
                <div class="section-content">
                    <p>These Terms shall be interpreted and governed by the laws of the United Kingdom. Any disputes arising from these Terms or your use of the Service shall be subject to the exclusive jurisdiction of the courts of the United Kingdom.</p>
                </div>
            </div>

            <div class="terms-section">
                <h2 class="section-title" style="color: #000000 !important;">12. Contact Information</h2>
                <div class="section-content">
                    <p>If you have any questions about these Terms of Service, please contact us:</p>
                    
                    <div class="contact-info">
                        <h4 style="color: #000000 !important;">Good Chat Support</h4>
                        <p><strong>Email:</strong> support@thegoodchatapp.com</p>
                        <p><strong>Response Time:</strong> We aim to respond to all inquiries within 24-48 hours</p>
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
            if (style.textContent.includes('terms-container')) {
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

        // Add aggressive CSS override - only target terms content, not global header
        const aggressiveStyle = document.createElement('style');
        aggressiveStyle.textContent = `
            .terms-container .terms-section h2,
            .terms-container .terms-section .section-title,
            .terms-container .section-title,
            .terms-section h2,
            .terms-section .section-title,
            div[class*="terms"] h2 {
                color: #000000 !important;
                font-weight: 700 !important;
            }
            
            .terms-container h4,
            .terms-container .section-content h4,
            .terms-section h4,
            div[class*="terms"] h4 {
                color: #2d3748 !important;
                font-weight: 600 !important;
            }
        `;
        document.head.appendChild(aggressiveStyle);

        // Force dark colors on terms section headings only
        setTimeout(() => {
            // Target all h2 elements within the terms content
            const allH2 = document.querySelectorAll('.terms-container h2, .terms-section h2');
            const allH4 = document.querySelectorAll('.terms-container h4, .terms-section h4');
            
            console.log('Found h2 elements:', allH2.length);
            console.log('Found h4 elements:', allH4.length);
            
            allH2.forEach((h2, index) => {
                // Only style if it's not the main "Terms of Service" title
                if (!h2.classList.contains('terms-title')) {
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
        document.title = 'Terms of Service - Good Chat';
        
        // Add SPA page class to hide footer marketing sections
        document.body.classList.add('spa-page');
    }
}

// Make the class available globally
window.TermsPage = TermsPage;
