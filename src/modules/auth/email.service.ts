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
    const currentYear = new Date().getFullYear();

    if (template === 'email-verification') {
      return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta http-equiv="x-ua-compatible" content="ie=edge" />
    <title>Verify your email</title>
    <style>
      html, body { margin:0 !important; padding:0 !important; height:100% !important; width:100% !important; }
      * { -ms-text-size-adjust:100%; -webkit-text-size-adjust:100%; }
      table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; border-collapse:collapse !important; }
      img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; display:block; }
      a { text-decoration:none; }
      @media screen and (max-width:600px) {
        .px { padding-left:20px !important; padding-right:20px !important; }
        .py { padding-top:20px !important; padding-bottom:20px !important; }
        .h1 { font-size:24px !important; line-height:30px !important; }
        .otp-code { font-size:24px !important; letter-spacing:5px !important; }
        .hero { padding:22px 20px !important; }
      }
      @media (prefers-color-scheme: dark) {
        .container { background:#0B0D14 !important; }
        .card { background:#0F121A !important; border-color:#1C2233 !important; }
        .logo { color:#FFFFFF !important; }
        .h1 { color:#FFFFFF !important; }
        .p, .p-content { color:#FFFFFF !important; }
        .muted { color:#E5E7EB !important; }
        .divider { background:#1C2233 !important; }
        .otp-wrap { background:#1A1D2E !important; border-color:#2D3348 !important; }
        .otp-label { color:#FFFFFF !important; }
        .otp-code { color:#FFFFFF !important; }
        .note { background:#1A1D2E !important; border-color:#2D3348 !important; }
        .note-text { color:#E5E7EB !important; }
        .footer-text { color:#E5E7EB !important; }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background:#F3F4F8;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; background:#F3F4F8;" class="container">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; max-width:640px; margin:0 auto;">
            <tr>
              <td style="padding:10px 6px 16px 6px;">
                <div class="logo" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,Arial,sans-serif; font-weight:800; font-size:14px; letter-spacing:0.2px; color:#160E53;">
                  Viargos
                </div>
              </td>
            </tr>
            <tr>
              <td style="background:#FFFFFF; border-radius:20px; border:1px solid #E7EAF0; overflow:hidden;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="background:linear-gradient(135deg, #160E53 0%, #241A7A 55%, #2D1F7A 100%); color:#FFFFFF; padding:28px 32px;">
                      <div style="font-size:12px; letter-spacing:0.12em; text-transform:uppercase; color:#D6D9FF; font-weight:700;">Email verification</div>
                      <h1 style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,Arial,sans-serif; font-size:30px; line-height:36px; font-weight:800; color:#FFFFFF; margin:8px 0 0 0;">Verify your email</h1>
                      <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,Arial,sans-serif; font-size:16px; line-height:24px; color:#E8E9FF; margin:8px 0 0 0;">
                        Hi ${username || 'there'}, verify your email to secure your Viargos account.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:28px 32px;">
                      <p class="p-content" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,Arial,sans-serif; font-size:16px; line-height:24px; color:#1F2937; margin:0;">
                        Use the code below to complete verification. This code expires in <strong>10 minutes</strong>.
                      </p>
                      <div style="margin:18px 0 10px 0;">
                        <div class="otp-wrap" style="background:#F6F7FB; border-radius:16px; border:1px solid #E6E8F2; padding:18px; text-align:center;">
                          <p class="otp-label" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,Arial,sans-serif; font-size:12px; font-weight:700; color:#4C5BD4; letter-spacing:0.08em; text-transform:uppercase; margin:0 0 10px 0;">Verification code</p>
                          <p class="otp-code" style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace; font-size:30px; letter-spacing:6px; font-weight:800; color:#160E53; margin:0;">${otp}</p>
                        </div>
                      </div>
                      <div class="note" style="background:#F9FAFB; border:1px solid #E7EAF0; border-radius:12px; padding:12px 14px; margin-top:14px;">
                        <p class="note-text" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,Arial,sans-serif; font-size:13px; line-height:19px; color:#667085; margin:0;">
                          If you did not request this, you can safely ignore this email. Never share this code with anyone.
                        </p>
                      </div>
                      <div class="divider" style="height:1px; background:#E7EAF0; width:100%; margin:22px 0 14px 0;"></div>
                      <p class="footer-text" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,Arial,sans-serif; font-size:13px; line-height:19px; color:#667085; margin:0;">
                        This is an automated message. If you need help, contact our support team.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 6px 0 6px;">
                <p class="footer-text" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,Arial,sans-serif; font-size:13px; line-height:19px; color:#667085; margin:0;">
                  © ${currentYear} Viargos. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
    } else if (template === 'password-reset') {
      return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta http-equiv="x-ua-compatible" content="ie=edge" />
    <title>Reset your password</title>
    <style>
      html, body { margin:0 !important; padding:0 !important; height:100% !important; width:100% !important; }
      * { -ms-text-size-adjust:100%; -webkit-text-size-adjust:100%; }
      table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; border-collapse:collapse !important; }
      img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; display:block; }
      a { text-decoration:none; }
      @media screen and (max-width:600px) {
        .px { padding-left:20px !important; padding-right:20px !important; }
        .py { padding-top:20px !important; padding-bottom:20px !important; }
        .h1 { font-size:24px !important; line-height:30px !important; }
        .otp-code { font-size:24px !important; letter-spacing:5px !important; }
        .hero { padding:22px 20px !important; }
      }
      @media (prefers-color-scheme: dark) {
        .container { background:#0B0D14 !important; }
        .card { background:#0F121A !important; border-color:#1C2233 !important; }
        .logo { color:#FFFFFF !important; }
        .h1 { color:#FFFFFF !important; }
        .p, .p-content { color:#FFFFFF !important; }
        .muted { color:#E5E7EB !important; }
        .divider { background:#1C2233 !important; }
        .otp-wrap { background:#1A1D2E !important; border-color:#2D3348 !important; }
        .otp-label { color:#FFFFFF !important; }
        .otp-code { color:#FFFFFF !important; }
        .warning { background:#3D1F1F !important; border-color:#7F1D1D !important; }
        .warning-text { color:#FFFFFF !important; }
        .footer-text { color:#E5E7EB !important; }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background:#F3F4F8;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; background:#F3F4F8;" class="container">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; max-width:640px; margin:0 auto;">
            <tr>
              <td style="padding:10px 6px 16px 6px;">
                <div class="logo" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,Arial,sans-serif; font-weight:800; font-size:14px; letter-spacing:0.2px; color:#160E53;">
                  Viargos
                </div>
              </td>
            </tr>
            <tr>
              <td class="card" style="background:#FFFFFF; border-radius:20px; border:1px solid #E7EAF0; overflow:hidden;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="background:linear-gradient(135deg, #160E53 0%, #241A7A 50%, #3A1F7A 100%); color:#FFFFFF; padding:28px 32px;">
                      <div style="font-size:12px; letter-spacing:0.12em; text-transform:uppercase; color:#FFD6D6; font-weight:700;">Password reset</div>
                      <h1 style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,Arial,sans-serif; font-size:30px; line-height:36px; font-weight:800; color:#FFFFFF; margin:8px 0 0 0;">Reset your password</h1>
                      <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,Arial,sans-serif; font-size:16px; line-height:24px; color:#E8E9FF; margin:8px 0 0 0;">
                        Hi ${username || 'there'}, we received a request to reset your password.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:28px 32px;">
                      <p class="p-content" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,Arial,sans-serif; font-size:16px; line-height:24px; color:#1F2937; margin:0;">
                        Use the code below to continue. This code expires in <strong>10 minutes</strong>.
                      </p>
                      <div style="margin:18px 0 10px 0;">
                        <div class="otp-wrap" style="background:#F6F7FB; border-radius:16px; border:1px solid #E6E8F2; padding:18px; text-align:center;">
                          <p class="otp-label" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,Arial,sans-serif; font-size:12px; font-weight:700; color:#4C5BD4; letter-spacing:0.08em; text-transform:uppercase; margin:0 0 10px 0;">Password reset code</p>
                          <p class="otp-code" style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace; font-size:30px; letter-spacing:6px; font-weight:800; color:#160E53; margin:0;">${otp}</p>
                        </div>
                      </div>
                      <div class="warning" style="background:#FFF5F5; border:1px solid #FECACA; padding:12px 14px; border-radius:12px; margin-top:16px;">
                        <p class="warning-text" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,Arial,sans-serif; font-size:13px; line-height:19px; color:#7F1D1D; margin:0;">
                          If you did not request a password reset, you can safely ignore this email. Never share this code with anyone.
                        </p>
                      </div>
                      <div class="divider" style="height:1px; background:#E7EAF0; width:100%; margin:22px 0 14px 0;"></div>
                      <p class="footer-text" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,Arial,sans-serif; font-size:13px; line-height:19px; color:#667085; margin:0;">
                        This is an automated message. If you need help, contact our support team.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 6px 0 6px;">
                <p class="footer-text" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,Arial,sans-serif; font-size:13px; line-height:19px; color:#667085; margin:0;">
                  © ${currentYear} Viargos. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
    }

    return `<p>Hello ${username}, your OTP is: <strong>${otp}</strong></p>`;
  }
}
