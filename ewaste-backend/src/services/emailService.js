// ─── Email Service ────────────────────────────────────────────────────────────
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendEmail = async ({ to, subject, html }) => {
  const mailOptions = {
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to,
    subject,
    html
  };
  const info = await transporter.sendMail(mailOptions);
  logger.info(`Email sent to ${to}: ${info.messageId}`);
  return info;
};

const emailTemplates = {
  verification: (name, token) => `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #e0e0e0;border-radius:8px">
      <h2 style="color:#2e7d32">♻️ Verify Your EWaste Account</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p>Thank you for joining our e-waste recycling platform! Please verify your email to get started.</p>
      <a href="${process.env.CLIENT_URL}/verify-email/${token}"
         style="display:inline-block;padding:12px 24px;background:#2e7d32;color:white;text-decoration:none;border-radius:6px;margin:16px 0">
        Verify Email
      </a>
      <p style="color:#666;font-size:12px">This link expires in 24 hours. If you didn't register, ignore this email.</p>
    </div>
  `,
  passwordReset: (name, token) => `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #e0e0e0;border-radius:8px">
      <h2 style="color:#1565c0">🔒 Reset Your Password</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p>You requested a password reset. Click the button below to set a new password.</p>
      <a href="${process.env.CLIENT_URL}/reset-password/${token}"
         style="display:inline-block;padding:12px 24px;background:#1565c0;color:white;text-decoration:none;border-radius:6px;margin:16px 0">
        Reset Password
      </a>
      <p style="color:#666;font-size:12px">This link expires in 1 hour. If you didn't request this, please contact support.</p>
    </div>
  `,
  pickupConfirmation: (name, pickup) => `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #e0e0e0;border-radius:8px">
      <h2 style="color:#2e7d32">✅ Pickup Confirmed!</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p>Your e-waste pickup has been confirmed.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;color:#666">Pickup ID</td><td><strong>${pickup.pickupId}</strong></td></tr>
        <tr><td style="padding:8px;color:#666">Scheduled Date</td><td><strong>${new Date(pickup.scheduledDate).toDateString()}</strong></td></tr>
        <tr><td style="padding:8px;color:#666">Time Slot</td><td><strong>${pickup.timeSlot?.start} - ${pickup.timeSlot?.end}</strong></td></tr>
      </table>
      <p>Keep your items ready for collection. You will receive an OTP before the pickup agent arrives.</p>
    </div>
  `
};

exports.sendVerificationEmail = (email, name, token) =>
  sendEmail({ to: email, subject: 'Verify your EWaste Platform account', html: emailTemplates.verification(name, token) });

exports.sendPasswordResetEmail = (email, name, token) =>
  sendEmail({ to: email, subject: 'Reset your EWaste Platform password', html: emailTemplates.passwordReset(name, token) });

exports.sendPickupConfirmationEmail = (email, name, pickup) =>
  sendEmail({ to: email, subject: `Pickup Confirmed - ${pickup.pickupId}`, html: emailTemplates.pickupConfirmation(name, pickup) });
