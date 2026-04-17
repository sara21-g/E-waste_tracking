// test-email.js
require('dotenv').config();
const emailjs = require('@emailjs/nodejs');

async function test() {
    console.log('\n📧 Testing Email.js...\n');
    
    // Check what credentials we have
    console.log('Public Key:', process.env.EMAILJS_PUBLIC_KEY ? '✅' : '❌ MISSING');
    console.log('Service ID:', process.env.EMAILJS_SERVICE_ID ? '✅' : '❌ MISSING');
    console.log('Template ID:', process.env.EMAILJS_TEMPLATE_ID ? '✅' : '❌ MISSING');
    
    try {
        const response = await emailjs.send(
            process.env.EMAILJS_SERVICE_ID,
            process.env.EMAILJS_TEMPLATE_ID,
            {
                to_email: 'prititambe22@gmail.com',
                tracking_id: 'TEST-123',
                item_description: 'Test Laptop',
                weight: '2.5',
                qr_data_url: 'https://via.placeholder.com/150?text=QR+Code',
                tracking_url: 'http://localhost:5500/test',
                credits_estimate: '4.50',
                date: '15 Jan 2024, 2:30 PM'
            },
            {
                publicKey: process.env.EMAILJS_PUBLIC_KEY,
                privateKey: process.env.EMAILJS_PRIVATE_KEY
            }
        );
        console.log('\n✅ Email sent successfully!');
        console.log('Status:', response.status);
    } catch (error) {
        console.log('\n❌ Email failed!');
        console.log('Error message:', error.message);
        console.log('Error code:', error.code);
        console.log('Error text:', error.text);
    }
}

test();