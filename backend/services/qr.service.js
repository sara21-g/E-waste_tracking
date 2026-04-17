const QRCode = require('qrcode');

class QRService {
    async generateQRCode(trackingId) {
        try {
            // Create tracking URL with the ID as query parameter
            const trackingUrl = `${process.env.TRACKING_BASE_URL}?id=${trackingId}`;
            
            // Generate QR as data URL (can be embedded directly in email)
            const qrDataUrl = await QRCode.toDataURL(trackingUrl, {
                errorCorrectionLevel: 'H',
                margin: 2,
                width: 300,
                color: {
                    dark: '#1a5e2a',  // Green theme for e-waste
                    light: '#ffffff'
                }
            });
            
            return {
                url: trackingUrl,
                dataUrl: qrDataUrl
            };
        } catch (error) {
            console.error('QR generation error:', error);
            throw error;
        }
    }
}

module.exports = new QRService();