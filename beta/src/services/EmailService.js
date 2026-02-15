const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');
const { SMTP, SITE_URL } = require('../config');

class EmailService {
    constructor() {
        this.transporter = null;
        this.templatesDir = path.join(__dirname, '../../views/emails');
    }

    /**
     * Initialize the email transporter
     */
    getTransporter() {
        if (!this.transporter) {
            // Check if SMTP is configured
            if (!SMTP.USER || !SMTP.PASS) {
                console.warn('Email service: SMTP credentials not configured. Emails will be logged to console.');
                return null;
            }

            this.transporter = nodemailer.createTransport({
                host: SMTP.HOST,
                port: SMTP.PORT,
                secure: SMTP.PORT === 465,
                auth: {
                    user: SMTP.USER,
                    pass: SMTP.PASS
                }
            });
        }
        return this.transporter;
    }

    /**
     * Render an email template
     * @param {string} templateName - Name of the template (without extension)
     * @param {Object} data - Data to pass to the template
     * @returns {Promise<{html: string, text: string}>}
     */
    async renderTemplate(templateName, data) {
        const htmlPath = path.join(this.templatesDir, `${templateName}.html.ejs`);
        const textPath = path.join(this.templatesDir, `${templateName}.txt.ejs`);

        const html = await ejs.renderFile(htmlPath, data);
        const text = await ejs.renderFile(textPath, data);

        return { html, text };
    }

    /**
     * Send password reset email
     * @param {string} email - Recipient email
     * @param {string} username - User's username
     * @param {string} resetToken - Password reset token
     * @param {string} ipAddress - IP address of the requester
     * @returns {Promise<boolean>} Success status
     */
    async sendPasswordResetEmail(email, username, resetToken, ipAddress = 'Unknown') {
        const resetLink = `${SITE_URL}/lost-password/${resetToken}/`;

        const templateData = {
            username,
            siteUrl: SITE_URL,
            ipAddress,
            resetLink
        };

        const { html, text } = await this.renderTemplate('password_reset', templateData);

        const mailOptions = {
            from: SMTP.FROM,
            to: email,
            subject: 'Naruto-Arena.com Account Password Reset',
            html,
            text
        };

        const transporter = this.getTransporter();

        if (!transporter) {
            // Log to console if no transporter (development mode)
            console.log('=== PASSWORD RESET EMAIL ===');
            console.log('To:', email);
            console.log('Username:', username);
            console.log('IP Address:', ipAddress);
            console.log('Reset Link:', resetLink);
            console.log('============================');
            return true;
        }

        try {
            await transporter.sendMail(mailOptions);
            console.log(`Password reset email sent to ${email}`);
            return true;
        } catch (error) {
            console.error('Error sending password reset email:', error);
            return false;
        }
    }
}

module.exports = new EmailService();
