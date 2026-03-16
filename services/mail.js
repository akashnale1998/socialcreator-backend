const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send verification email
 * @param {Object} user - User object
 * @param {string} lang - Language code (default: 'en')
 */
const sendVerificationEmail = async (user, lang = 'en') => {
  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  const verificationUrl = `${process.env.FRONTEND_URL || 'https://socialcreatorapp.com'}/verify-email?token=${token}`;

  const mailOptions = {
    from: `"SocialCreator AI" <${process.env.SMTP_USER}>`,
    to: user.email,
    subject: 'Verify your email – SocialCreator AI',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
        <h2 style="color: #6366f1;">Welcome to SocialCreator AI, ${user.name}!</h2>
        <p style="font-size: 16px; color: #333;">Please verify your email address to activate your account and start generating viral content.</p>
        <div style="margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Verify Email</a>
        </div>
        <p style="font-size: 14px; color: #666;">This link will expire in 24 hours.</p>
        <p style="font-size: 12px; color: #999; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
          If you didn't sign up for SocialCreator AI, you can safely ignore this email.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendVerificationEmail,
};
