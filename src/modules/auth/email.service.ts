import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { Logger } from '../../common/utils';

@Injectable()
export class EmailService {
  private readonly logger = Logger.child({ service: 'EmailService' });
  private readonly useResend: boolean;
  private resendApiKey: string;

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {
    this.resendApiKey = this.configService.get<string>('RESEND_API_KEY') || '';
    this.useResend = !!this.resendApiKey && this.resendApiKey.startsWith('re_');

    if (this.useResend) {
      this.logger.info('Using Resend API for email sending');
    } else {
      this.logger.info('Using SMTP for email sending');
    }
  }

  async sendEmail(options: {
    to: string;
    subject: string;
    template: string;
    context: any;
  }): Promise<void> {
    const { to, subject, template, context } = options;
    const from =
      this.configService.get<string>('EMAIL_USER') ||
      this.configService.get<string>('MAIL_FROM') ||
      this.configService.get<string>('MAIL_USER');

    try {
      if (this.useResend) {
        // Use Resend API (HTTP-based, more reliable on Railway)
        await this.sendViaResend({ to, from, subject, template, context });
      } else {
        // Fallback to SMTP
        await this.sendViaSmtp({ to, from, subject, template, context });
      }
    } catch (error) {
      this.logger.error('Email sending failed', {
        to,
        method: this.useResend ? 'Resend API' : 'SMTP',
        error: error.message,
      });
      throw error;
    }
  }

  private async sendViaSmtp(options: {
    to: string;
    from: string;
    subject: string;
    template: string;
    context: any;
  }): Promise<void> {
    await this.mailerService.sendMail({
      from: options.from,
      to: options.to,
      subject: options.subject,
      template: options.template,
      context: options.context,
    });
  }

  private async sendViaResend(options: {
    to: string;
    from: string;
    subject: string;
    template: string;
    context: any;
  }): Promise<void> {
    const { to, from, subject, template, context } = options;

    // Generate HTML from template
    const html = this.generateEmailHtml(template, context);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: from,
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send email via Resend');
    }

    this.logger.info('Email sent successfully via Resend API', { to });
  }

  private generateEmailHtml(template: string, context: any): string {
    const { username, otp } = context;

    if (template === 'email-verification') {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 30px; }
            .otp-box { background-color: white; border: 2px solid #4F46E5; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .otp-code { font-size: 32px; font-weight: bold; color: #4F46E5; letter-spacing: 5px; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Verify Your Email</h1>
            </div>
            <div class="content">
              <p>Hello ${username || 'there'},</p>
              <p>Thank you for signing up! Please use the following OTP code to verify your email address:</p>
              <div class="otp-box">
                <div class="otp-code">${otp}</div>
              </div>
              <p>This code will expire in 10 minutes.</p>
              <p>If you didn't request this code, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2025 Viargos. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (template === 'password-reset') {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #DC2626; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 30px; }
            .otp-box { background-color: white; border: 2px solid #DC2626; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .otp-code { font-size: 32px; font-weight: bold; color: #DC2626; letter-spacing: 5px; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hello ${username || 'there'},</p>
              <p>We received a request to reset your password. Please use the following OTP code:</p>
              <div class="otp-box">
                <div class="otp-code">${otp}</div>
              </div>
              <p>This code will expire in 10 minutes.</p>
              <p>If you didn't request this password reset, please ignore this email and your password will remain unchanged.</p>
            </div>
            <div class="footer">
              <p>© 2025 Viargos. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    return `<p>Hello ${username}, your OTP is: <strong>${otp}</strong></p>`;
  }
}






