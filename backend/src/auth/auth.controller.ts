import { Controller, Post, Get, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './auth.dto';
import { GoogleAuthDto } from './google-auth.dto';

@Controller('api/auth')
export class AuthController {
    constructor(private authService: AuthService) { }

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
}
