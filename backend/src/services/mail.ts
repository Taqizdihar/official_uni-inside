import nodemailer from 'nodemailer';
import type { Config } from '../config/env';
import { HttpError } from '../utils/http';

export async function sendLink(config: Config, to: string, subject: string, url: string) {
  if (!config.SMTP_HOST || !config.SMTP_FROM_EMAIL) {
    if (config.NODE_ENV === 'production') throw new HttpError(503, 'INTEGRATION_NOT_CONFIGURED', 'Email delivery is not configured.');
    return false;
  }
  const transport = nodemailer.createTransport({ host: config.SMTP_HOST, port: config.SMTP_PORT, secure: config.SMTP_SECURE, auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD } : undefined });
  await transport.sendMail({ from: { name: config.SMTP_FROM_NAME, address: config.SMTP_FROM_EMAIL }, to, subject, text: `Open this link to continue: ${url}` });
  return true;
}
