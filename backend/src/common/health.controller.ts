import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api')
export class HealthController {
    constructor(private prisma: PrismaService) { }

    @SkipThrottle()
    @Get('health')
    async check() {
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            return {
                status: 'ok',
                timestamp: new Date().toISOString(),
                database: 'connected',
            };
        } catch {
            return {
                status: 'error',
                timestamp: new Date().toISOString(),
                database: 'disconnected',
            };
        }
    }
}
