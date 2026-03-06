import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private transporter: nodemailer.Transporter;

    constructor(private configService: ConfigService) {
        const host = this.configService.get<string>('SMTP_HOST');
        const port = this.configService.get<number>('SMTP_PORT') || 587;
        const user = this.configService.get<string>('SMTP_USER');
        const pass = this.configService.get<string>('SMTP_PASS');

        if (host && user && pass) {
            this.transporter = nodemailer.createTransport({
                host,
                port,
                secure: port === 465,
                auth: { user, pass },
            });
            this.logger.log(`Email configured via ${host}`);
        } else {
            // Dev mode — log emails to console instead of sending
            this.logger.warn('SMTP not configured — emails will be logged to console');
            this.transporter = nodemailer.createTransport({
                jsonTransport: true,
            });
        }
    }

    async sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
        const baseUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
        const verifyUrl = `${baseUrl}/verify?token=${token}`;

        const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="font-size: 28px; margin: 0; color: #6366f1;">⚡ Serpynx</h1>
                    <p style="color: #666; margin-top: 8px;">Smart Freelance Marketplace</p>
                </div>
                <div style="background: #f9fafb; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
                    <h2 style="margin-top: 0; color: #111;">Verify your email, ${name}</h2>
                    <p style="color: #555; line-height: 1.6;">
                        Thanks for signing up! Please verify your email address to get started on Serpynx.
                    </p>
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="${verifyUrl}" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                            Verify Email
                        </a>
                    </div>
                    <p style="color: #999; font-size: 13px;">
                        This link expires in 24 hours. If you didn't sign up for Serpynx, you can safely ignore this email.
                    </p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                    <p style="color: #999; font-size: 12px;">
                        If the button doesn't work, copy and paste this link:<br/>
                        <a href="${verifyUrl}" style="color: #6366f1; word-break: break-all;">${verifyUrl}</a>
                    </p>
                </div>
            </div>
        `;

        try {
            const info = await this.transporter.sendMail({
                from: this.configService.get<string>('SMTP_FROM') || '"Serpynx" <noreply@serpynx.com>',
                to,
                subject: 'Verify your Serpynx account',
                html,
            });

            if (info.message) {
                // jsonTransport (dev mode) — log the email content
                this.logger.log(`[DEV EMAIL] Verification email for ${to}:`);
                const parsed = JSON.parse(info.message);
                this.logger.log(`  → Subject: ${parsed.subject}`);
                this.logger.log(`  → Verify URL: ${verifyUrl}`);
            } else {
                this.logger.log(`Verification email sent to ${to}`);
            }
        } catch (error) {
            this.logger.error(`Failed to send verification email to ${to}`, error);
            // Don't throw — we don't want email failures to block registration
        }
    }
}
