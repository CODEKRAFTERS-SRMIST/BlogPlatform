import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});

try {
  transporter.verify((error) => {
    if (error) {
      logger.error('Email transporter verification failed (non-fatal)', { error: error.message });
    } else {
      logger.info('Email transporter connected');
    }
  });
} catch (err) {
  logger.error('Email transporter initialization error (non-fatal)', { error: err.message });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function sendEmail(to, subject, html, retries = 3) {
  if (process.env.EMAIL_DISABLE === 'true') {
    logger.info('Email disabled, skipping', { to, subject });
    return { skipped: true };
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
    to,
    subject,
    html,
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await transporter.sendMail(mailOptions);
      logger.info('Email sent successfully', { to, subject, messageId: result.messageId });
      return result;
    } catch (error) {
      logger.error(`Email attempt ${attempt} failed`, { to, subject, error: error.message });

      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000;
        logger.info(`Retrying in ${delay}ms...`);
        await sleep(delay);
      } else {
        logger.error('All email retry attempts exhausted', { to, subject });
        throw error;
      }
    }
  }
}

export function renderTemplate(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || '');
}
