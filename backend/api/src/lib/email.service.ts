import { Resend } from "resend";
import { env } from "../config/env.js";
import { logger } from "../shared/logger.js";

const resend = new Resend(env.RESEND_API_KEY);
const FROM_EMAIL = env.EMAIL_FROM;

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export class EmailService {
  async sendEmail(options: SendEmailOptions): Promise<void> {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      if (error) {
        logger.error({ error, ...options }, "Failed to send email");
        throw new Error(`Email sending failed: ${error.message}`);
      }

      logger.info({ emailId: data?.id, to: options.to }, "Email sent successfully");
    } catch (err: any) {
      logger.error({ error: err, ...options }, "Exception occurred while sending email");
      throw err;
    }
  }

  async sendOTP(to: string, otp: string): Promise<void> {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your Moots Verification Code</h2>
        <p>Use the code below to sign in or register:</p>
        <h1 style="font-size: 32px; letter-spacing: 4px; color: #333;">${otp}</h1>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      </div>
    `;
    await this.sendEmail({
      to,
      subject: "Moots Login Code",
      html,
    });
  }
}

export const emailService = new EmailService();
