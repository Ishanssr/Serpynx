import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private readonly apiKey: string | undefined;
    private readonly fromEmail: string;

    constructor(private configService: ConfigService) {
        this.apiKey = this.configService.get<string>('SMTP_PASS') ||
            this.configService.get<string>('RESEND_API_KEY');
        this.fromEmail = this.configService.get<string>('SMTP_FROM') || 'onboarding@resend.dev';

        if (this.apiKey) {
            this.logger.log(`Email configured via Resend HTTP API (from: ${this.fromEmail}, key: ${this.apiKey.slice(0, 8)}...)`);
        } else {
            this.logger.warn('No email API key configured — emails will be logged to console');
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

        if (!this.apiKey) {
            this.logger.log(`[DEV EMAIL] Verification email for ${to}:`);
            this.logger.log(`  → Verify URL: ${verifyUrl}`);
            return;
        }

        const payload = {
            from: this.fromEmail,
            to: [to],
            subject: 'Verify your Serpynx account',
            html,
        };

        this.logger.log(`Sending email to ${to} from ${this.fromEmail}...`);

        try {
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const responseBody = await res.text();
            this.logger.log(`Resend API response [${res.status}]: ${responseBody}`);

            if (!res.ok) {
                this.logger.error(`Resend API failed for ${to}: status=${res.status} body=${responseBody}`);
            }
        } catch (error) {
            this.logger.error(`Failed to send verification email to ${to}: ${error.message}`);
        }
    }
}
