import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './auth.dto';
import { GoogleAuthDto } from './google-auth.dto';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    async register(dto: RegisterDto) {
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existing) {
            throw new ConflictException('Email already registered');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const user = await this.prisma.user.create({
            data: {
                name: dto.name,
                email: dto.email,
                password: hashedPassword,
                role: dto.role,
                skills: dto.skills || [],
                bio: dto.bio,
            },
        });

        const token = this.generateToken(user.id, user.email, user.role);

        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                skills: user.skills,
                bio: user.bio,
            },
            accessToken: token,
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
            // Link Google ID if logging in with email-registered account
            if (!user.googleId) {
                user = await this.prisma.user.update({
                    where: { id: user.id },
                    data: { googleId },
                });
            }
        } else {
            // New user — create account
            const role = dto.role || 'FREELANCER';
            user = await this.prisma.user.create({
                data: {
                    email,
                    name: name || email.split('@')[0],
                    googleId,
                    role,
                    skills: [],
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
