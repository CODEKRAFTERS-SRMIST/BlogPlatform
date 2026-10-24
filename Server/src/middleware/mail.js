import { sendEmail } from '../services/email.service.js';
import { logger } from '../utils/logger.js';

export async function sendMail(to, subject, html) {
  try {
    // We intentionally don't await this if we want fire-and-forget, 
    // but the caller handles the await. Inside here, we catch everything.
    await sendEmail(to, subject, html);
    logger.info('Email sent successfully', { to, subject });
  } catch (error) {
    logger.error('Failed to send email (non-fatal)', { to, subject, error: error.message });
    // Do NOT throw here, we want the calling process to continue
  }
}

const baseTemplate = (content, header) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${header}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4a90d9; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #4a90d9; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
    .alert { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${header}</h1>
  </div>
  <div class="content">
    ${content}
  </div>
  <div class="footer">
    <p>This is an automated message from BlogPlatform.</p>
    <p>If you didn't request this email, please ignore it.</p>
  </div>
</body>
</html>
`;

export const emailTemplates = {
  userApproval: (name, setPasswordUrl) => baseTemplate(
    `<h2>Welcome to BlogPlatform!</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>Your account has been approved by our admin team. You can now set your password and start using all features.</p>
    <p style="text-align: center;">
      <a href="${setPasswordUrl}" class="button">Set Password</a>
    </p>
    <div class="alert">
      <strong>⚠️ Important:</strong> This link expires in <strong>24 hours</strong>.
    </div>
    <p>Or copy this link into your browser:</p>
    <p style="word-break: break-all; color: #666;">${setPasswordUrl}</p>`,
    'Account Approved!'
  ),

  blogApproval: (title) => baseTemplate(
    `<h2>Blog Post Approved! 🎉</h2>
    <p>Great news! Your blog post has been approved and is now published.</p>
    <p><strong>Title:</strong> ${title}</p>
    <p>Thank you for your contribution to BlogPlatform!</p>`,
    'Blog Post Approved'
  ),

  blogRejection: (title, reason) => baseTemplate(
    `<h2>Blog Post Update</h2>
    <p>Unfortunately, your blog post was not approved.</p>
    <p><strong>Title:</strong> ${title}</p>
    <div class="alert">
      <strong>Reason:</strong><br>${reason}
    </div>
    <p>Please make the necessary changes and resubmit your blog post.</p>`,
    'Blog Post Not Approved'
  ),

  emailVerification: (name, verifyUrl) => baseTemplate(
    `<h2>Verify Your Email</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>Please verify your email address to complete your registration.</p>
    <p style="text-align: center;">
      <a href="${verifyUrl}" class="button">Verify Email</a>
    </p>
    <div class="alert">
      <strong>⚠️ Important:</strong> This link expires in <strong>24 hours</strong>.
    </div>
    <p>Or copy this link into your browser:</p>
    <p style="word-break: break-all; color: #666;">${verifyUrl}</p>`,
    'Verify Your Email'
  ),

  passwordReset: (name, resetUrl) => baseTemplate(
    `<h2>Password Reset Request</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>You requested a password reset. Click the button below to set a new password.</p>
    <p style="text-align: center;">
      <a href="${resetUrl}" class="button">Reset Password</a>
    </p>
    <div class="alert">
      <strong>⚠️ Important:</strong> This link expires in <strong>1 hour</strong>. If you didn't request this, please ignore this email.
    </div>`,
    'Password Reset'
  ),
};

export default { sendMail, emailTemplates };
