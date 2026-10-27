const nodemailer = require('nodemailer');

// In-memory log of sent verification emails for convenient UI simulation / developer debugging
const emailLog = [];

const sendVerificationEmail = async (email, name, token, originUrl) => {
  const verifyLink = `${originUrl || 'http://localhost:5000'}/api/auth/verify?token=${token}`;
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const clientVerifyLink = `${clientUrl}/verify?token=${token}`;

  const emailData = {
    to: email,
    name,
    token,
    verifyLink,
    clientVerifyLink,
    sentAt: new Date().toISOString(),
  };

  emailLog.push(emailData);

  console.log('\n======================================================');
  console.log('✉️  VERIFICATION EMAIL SENT / SIMULATED');
  console.log(`To: ${name} <${email}>`);
  console.log(`Token: ${token}`);
  console.log(`Backend Verify Endpoint: ${verifyLink}`);
  console.log(`Frontend Verification Link: ${clientVerifyLink}`);
  console.log('======================================================\n');

  // If real SMTP environment variables exist, attempt real sending
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: '"CommunityConnect" <noreply@communityconnect.local>',
        to: email,
        subject: 'Verify Your CommunityConnect Account',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #4f46e5;">Welcome to CommunityConnect, ${name}!</h2>
            <p>Thank you for joining the local event portal for Tier 2, 3 & 4 cities.</p>
            <p>Please click the button below to verify your email address and activate your account:</p>
            <a href="${verifyLink}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 16px 0;">Verify Email Address</a>
            <p style="color: #666; font-size: 13px;">Or copy and paste this link in your browser:</p>
            <p style="font-size: 13px; color: #4f46e5; word-break: break-all;">${verifyLink}</p>
          </div>
        `,
      });
    } catch (err) {
      console.error('SMTP Mail error (falling back to simulated email):', err.message);
    }
  }

  return emailData;
};

const getRecentEmails = () => emailLog.slice(-10);

module.exports = { sendVerificationEmail, getRecentEmails };
