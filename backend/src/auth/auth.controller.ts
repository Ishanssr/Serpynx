import { Controller, Post, Get, Delete, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './auth.dto';
import { GoogleAuthDto } from './google-auth.dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private prisma: PrismaService,
    ) { }

    @Throttle({ default: { ttl: 60000, limit: 10 } })
    @Post('register')
    register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Throttle({ default: { ttl: 60000, limit: 10 } })
    @Post('login')
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    @Throttle({ default: { ttl: 60000, limit: 10 } })
    @Post('google')
    googleLogin(@Body() dto: GoogleAuthDto) {
        return this.authService.googleLogin(dto);
    }

    @Get('verify')
    verifyEmail(@Query('token') token: string) {
        return this.authService.verifyEmail(token);
    }

    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @Post('resend-verification')
    resendVerification(@Body('email') email: string) {
        return this.authService.resendVerification(email);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('profile')
    getProfile(@Request() req) {
        return this.authService.getProfile(req.user.id);
    }

    // Admin: delete unverified user by email (protected by admin secret)
    @Delete('cleanup')
    async cleanupUser(@Query('email') email: string, @Query('secret') secret: string) {
        if (!secret || secret !== process.env.JWT_SECRET) {
            return { error: 'Unauthorized' };
        }
        if (!email) return { error: 'Email required' };

        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) return { message: 'User not found' };

        // Delete related records first, then user
        await this.prisma.notification.deleteMany({ where: { userId: user.id } });
        await this.prisma.review.deleteMany({ where: { OR: [{ reviewerId: user.id }, { revieweeId: user.id }] } });
        await this.prisma.submission.deleteMany({ where: { freelancerId: user.id } });
        await this.prisma.bid.deleteMany({ where: { freelancerId: user.id } });
        await this.prisma.task.deleteMany({ where: { OR: [{ clientId: user.id }, { assignedToId: user.id }] } });
        await this.prisma.user.delete({ where: { id: user.id } });

        return { message: `User ${email} deleted successfully` };
    }
}
