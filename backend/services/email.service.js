// services/email.service.js
const emailjs = require('@emailjs/nodejs');

class EmailService {
    constructor() {
        this.publicKey = process.env.EMAILJS_PUBLIC_KEY;
        this.serviceId = process.env.EMAILJS_SERVICE_ID;
        this.templateId = process.env.EMAILJS_TEMPLATE_ID;
        this.privateKey = process.env.EMAILJS_PRIVATE_KEY;
    }
    
    async sendTrackingEmail(userEmail, trackingId, qrDataUrl, trackingUrl, pickupDetails) {
        try {
            console.log('📧 Sending email via Email.js to:', userEmail);
            
            const templateParams = {
                to_email: userEmail,                    // Recipient
                tracking_id: trackingId,
                item_description: pickupDetails.itemDescription,
                weight: pickupDetails.estimatedWeight,
                qr_data_url: qrDataUrl,
                tracking_url: trackingUrl,
                date: new Date().toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })
            };
            
            const response = await emailjs.send(
                this.serviceId,
                this.templateId,
                templateParams,
                {
                    publicKey: this.publicKey,
                    privateKey: this.privateKey
                }
            );
            
            console.log('✅ Email sent successfully! Status:', response.status);
            return { success: true, status: response.status };
            
        } catch (error) {
            console.error('❌ Email.js error:', error.message);
            // Don't throw - we want the pickup to succeed even if email fails
            return { success: false, error: error.message };
        }
    }
}

module.exports = new EmailService();