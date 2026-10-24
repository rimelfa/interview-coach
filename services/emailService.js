const nodemailer = require('nodemailer');
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console()
    ]
});

class EmailService {
    constructor() {
        // For now, we'll use console logging as a fallback
        // You can configure with Gmail, SendGrid, or other providers later
        this.transporter = null;
        this.setupTransporter();
    }

    setupTransporter() {
        // For development, just log emails to console
        // In production, you'd configure with a real email service
        this.transporter = {
            sendMail: async (mailOptions) => {
                logger.info('Email would be sent:', {
                    to: mailOptions.to,
                    subject: mailOptions.subject,
                    html: mailOptions.html.substring(0, 200) + '...'
                });
                return { messageId: 'console-' + Date.now() };
            }
        };
    }

    async sendVerificationEmail(userData) {
        try {
            const { email, name, verificationToken, siteUrl } = userData;
            
            const firstName = name ? name.split(' ')[0] : 'there';
            const verificationUrl = `${siteUrl}/verify-email?token=${verificationToken}`;
            
            const htmlContent = this.getVerificationEmailTemplate(firstName, verificationUrl, siteUrl);
            
            const mailOptions = {
                from: '"Good Chat" <support@thegoodchatapp.com>',
                to: email,
                subject: 'Please verify your email - Good Chat',
                html: htmlContent
            };

            const result = await this.transporter.sendMail(mailOptions);
            logger.info(`Verification email sent to: ${email}`);
            return result;

        } catch (error) {
            logger.error('Error sending verification email:', error);
            throw error;
        }
    }

    getVerificationEmailTemplate(firstName, verificationUrl, siteUrl) {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - Good Chat</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f7fa;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 40px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px 16px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">
                                🎯 Good Chat
                            </h1>
                            <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.95;">
                                Your AI-Powered Interview Preparation Partner
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Verification Message -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <h2 style="margin: 0; color: #2d3748; font-size: 28px; font-weight: 600; text-align: center;">
                                📧 Please Verify Your Email
                            </h2>
                            <p style="margin: 20px 0; color: #4a5568; font-size: 16px; line-height: 1.6; text-align: center;">
                                Hi ${firstName}! We're excited to have you join Good Chat. 
                            </p>
                            <p style="margin: 20px 0; color: #4a5568; font-size: 16px; line-height: 1.6; text-align: center;">
                                To get started, please verify your email address by clicking the button below:
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Verification Button -->
                    <tr>
                        <td align="center" style="padding: 30px 40px;">
                            <a href="${verificationUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                                ✅ Verify My Email Address
                            </a>
                        </td>
                    </tr>
                    
                    <!-- Alternative Link -->
                    <tr>
                        <td style="padding: 20px 40px;">
                            <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; text-align: center;">
                                <p style="margin: 0 0 10px 0; color: #4a5568; font-size: 14px;">
                                    Having trouble with the button? Copy and paste this link into your browser:
                                </p>
                                <p style="margin: 0; color: #667eea; font-size: 14px; word-break: break-all;">
                                    ${verificationUrl}
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Security Notice -->
                    <tr>
                        <td style="padding: 20px 40px;">
                            <div style="background-color: #edf2f7; border-left: 4px solid #fbbf24; padding: 20px; border-radius: 8px;">
                                <h4 style="margin: 0 0 10px 0; color: #2d3748; font-size: 16px; font-weight: 600;">
                                    🔒 Security Notice
                                </h4>
                                <p style="margin: 0; color: #4a5568; font-size: 14px; line-height: 1.5;">
                                    This verification link will expire in 24 hours for your security. If you didn't create an account with Good Chat, you can safely ignore this email.
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Support Section -->
                    <tr>
                        <td style="padding: 20px 40px; border-top: 1px solid #e2e8f0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 10px 0; color: #718096; font-size: 14px;">
                                            Need help? We're here for you!
                                        </p>
                                        <p style="margin: 0; color: #718096; font-size: 14px;">
                                            <a href="${siteUrl}/support" style="color: #667eea; text-decoration: none;">Contact Support</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding: 30px 40px; background-color: #f8fafc; border-radius: 0 0 16px 16px;">
                            <p style="margin: 0 0 10px 0; color: #a0aec0; font-size: 12px;">
                                © 2024 Good Chat. All rights reserved.
                            </p>
                            <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                                You're receiving this email because you requested to create an account with Good Chat.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;
    }

    async sendPasswordResetEmail(userData) {
        try {
            const { email, resetToken, resetUrl, siteUrl } = userData;
            
            const htmlContent = this.getPasswordResetEmailTemplate(resetUrl, siteUrl);
            
            const mailOptions = {
                from: '"Good Chat" <noreply@goodchat.ai>',
                to: email,
                subject: 'Reset Your Password - Good Chat',
                html: htmlContent
            };
            
            const result = await this.transporter.sendMail(mailOptions);
            
            logger.info('Password reset email sent successfully:', {
                to: email,
                messageId: result.messageId
            });
            
            return result;
        } catch (error) {
            logger.error('Error sending password reset email:', error);
            throw error;
        }
    }

    getPasswordResetEmailTemplate(resetUrl, siteUrl) {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - Good Chat</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f7fa;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 40px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px 16px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">
                                🔒 Good Chat
                            </h1>
                            <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.95;">
                                Password Reset Request
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Reset Message -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <h2 style="margin: 0; color: #2d3748; font-size: 28px; font-weight: 600; text-align: center;">
                                🔑 Reset Your Password
                            </h2>
                            <p style="margin: 20px 0; color: #4a5568; font-size: 16px; line-height: 1.6; text-align: center;">
                                We received a request to reset your password for your Good Chat account.
                            </p>
                            <p style="margin: 20px 0; color: #4a5568; font-size: 16px; line-height: 1.6; text-align: center;">
                                Click the button below to reset your password:
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Reset Button -->
                    <tr>
                        <td align="center" style="padding: 30px 40px;">
                            <a href="${resetUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                                Reset Password
                            </a>
                        </td>
                    </tr>
                    
                    <!-- Security Notice -->
                    <tr>
                        <td style="padding: 20px 40px;">
                            <div style="background-color: #fef5e7; border: 1px solid #f6ad55; border-radius: 8px; padding: 20px;">
                                <p style="margin: 0; color: #c05621; font-size: 14px; line-height: 1.5;">
                                    <strong>Security Notice:</strong> This link will expire in 1 hour for your security. 
                                    If you didn't request this password reset, please ignore this email.
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Alternative Link -->
                    <tr>
                        <td style="padding: 20px 40px 40px 40px;">
                            <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.6; text-align: center;">
                                If the button above doesn't work, copy and paste this link into your browser:
                            </p>
                            <p style="margin: 10px 0 0 0; color: #667eea; font-size: 14px; word-break: break-all; text-align: center;">
                                ${resetUrl}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0; color: #a0aec0; font-size: 12px; text-align: center;">
                                This email was sent by Good Chat. If you have any questions, please contact our support team.
                            </p>
                            <p style="margin: 10px 0 0 0; color: #a0aec0; font-size: 12px; text-align: center;">
                                © 2024 Good Chat. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;
    }
}

module.exports = new EmailService();