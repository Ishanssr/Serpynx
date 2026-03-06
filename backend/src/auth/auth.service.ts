import { Injectable, ConflictException, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto, LoginDto } from './auth.dto';
import { GoogleAuthDto } from './google-auth.dto';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private emailService: EmailService,
    ) { }

    async register(dto: RegisterDto) {
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existing) {
            throw new ConflictException('Email already registered');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);
        // Auto-verify unless REQUIRE_EMAIL_VERIFICATION is explicitly set
        const requireVerification = process.env.REQUIRE_EMAIL_VERIFICATION === 'true';
        const verificationToken = crypto.randomUUID();
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const user = await this.prisma.user.create({
            data: {
                name: dto.name,
                email: dto.email,
                password: hashedPassword,
                role: dto.role,
                skills: dto.skills || [],
                bio: dto.bio,
                isVerified: !requireVerification, // auto-verify when not required
                verificationToken: requireVerification ? verificationToken : null,
                verificationExpires: requireVerification ? verificationExpires : null,
            },
        });

        // Send welcome/verification email in background
        if (requireVerification) {
            this.emailService.sendVerificationEmail(user.email, user.name, verificationToken);
        }

        const token = this.generateToken(user.id, user.email, user.role);

        return {
            message: requireVerification
                ? 'Registration successful! Please check your email to verify your account.'
                : 'Registration successful!',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                skills: user.skills,
                bio: user.bio,
            },
            accessToken: requireVerification ? undefined : token,
        };
    }

    async login(dto: LoginDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (!user || !user.password) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const passwordValid = await bcrypt.compare(dto.password, user.password);
        if (!passwordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Block login if email verification is required and not verified
        const requireVerification = process.env.REQUIRE_EMAIL_VERIFICATION === 'true';
        if (requireVerification && !user.isVerified) {
            throw new UnauthorizedException('Please verify your email before logging in. Check your inbox for the verification link.');
        }

        const token = this.generateToken(user.id, user.email, user.role);

        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                skills: user.skills,
                bio: user.bio,
                avgRating: user.avgRating,
                totalReviews: user.totalReviews,
            },
            accessToken: token,
        };
    }

    async verifyEmail(token: string) {
        const user = await this.prisma.user.findUnique({
            where: { verificationToken: token },
        });

        if (!user) {
            throw new BadRequestException('Invalid verification token');
        }

        if (user.isVerified) {
            return { message: 'Email is already verified. You can log in.' };
        }

        if (user.verificationExpires && user.verificationExpires < new Date()) {
            throw new BadRequestException('Verification token has expired. Please request a new one.');
        }

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                isVerified: true,
                verificationToken: null,
                verificationExpires: null,
            },
        });

        this.logger.log(`User ${user.email} verified their email`);

        return { message: 'Email verified successfully! You can now log in.' };
    }

    async resendVerification(email: string) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // Don't reveal whether email exists
            return { message: 'If an account with that email exists, a verification link has been sent.' };
        }

        if (user.isVerified) {
            return { message: 'Email is already verified. You can log in.' };
        }

        const verificationToken = crypto.randomUUID();
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await this.prisma.user.update({
            where: { id: user.id },
            data: { verificationToken, verificationExpires },
        });

        // Fire-and-forget — don't block the response
        this.emailService.sendVerificationEmail(user.email, user.name, verificationToken);

        return { message: 'If an account with that email exists, a verification link has been sent.' };
    }

    async googleLogin(dto: GoogleAuthDto) {
        // Verify Google ID token
        const payload = await this.verifyGoogleToken(dto.credential);
        if (!payload) {
            throw new UnauthorizedException('Invalid Google token');
        }

        const { email, name, sub: googleId } = payload;

        // Check if user exists (by googleId or email)
        let user = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { googleId },
                    { email },
                ],
            },
        });

        if (user) {
            // Link Google ID and auto-verify if logging in with email-registered account
            if (!user.googleId || !user.isVerified) {
                user = await this.prisma.user.update({
                    where: { id: user.id },
                    data: {
                        googleId: user.googleId || googleId,
                        isVerified: true,
                        verificationToken: null,
                        verificationExpires: null,
                    },
                });
            }
        } else {
            // New user — create account (Google users are auto-verified)
            const role = dto.role || 'FREELANCER';
            user = await this.prisma.user.create({
                data: {
                    email,
                    name: name || email.split('@')[0],
                    googleId,
                    role,
                    skills: [],
                    isVerified: true,
                },
            });
        }

        const token = this.generateToken(user.id, user.email, user.role);

        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                skills: user.skills,
                bio: user.bio,
                avgRating: user.avgRating,
                totalReviews: user.totalReviews,
            },
            accessToken: token,
            isNewUser: !user.createdAt || (Date.now() - user.createdAt.getTime() < 5000),
        };
    }

    private async verifyGoogleToken(idToken: string): Promise<{ email: string; name: string; sub: string } | null> {
        try {
            const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
            if (!res.ok) return null;
            const data = await res.json();
            if (!data.email || !data.email_verified) return null;
            return { email: data.email, name: data.name || '', sub: data.sub };
        } catch {
            return null;
        }
    }

    async getProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                skills: true,
                bio: true,
                avgRating: true,
                totalReviews: true,
                createdAt: true,
            },
        });
        return user;
    }

    private generateToken(userId: string, email: string, role: string): string {
        return this.jwtService.sign({ sub: userId, email, role });
    }
}
