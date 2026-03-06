import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class UploadsService {
    private readonly uploadDir: string;

    constructor(private prisma: PrismaService) {
        this.uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    /**
     * Process and record an uploaded file
     */
    getFileUrl(filename: string): string {
        // In production, this would return an S3/R2 URL
        const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
        return `${baseUrl}/uploads/${filename}`;
    }

    /**
     * Update user avatar
     */
    async updateAvatar(userId: string, filename: string) {
        const avatarUrl = this.getFileUrl(filename);
        await this.prisma.user.update({
            where: { id: userId },
            data: { avatarUrl },
        });
        return { avatarUrl };
    }

    /**
     * Validate uploaded file
     */
    validateFile(file: Express.Multer.File, opts?: { maxSize?: number; allowedTypes?: string[] }) {
        const maxSize = opts?.maxSize || 5 * 1024 * 1024; // 5MB default
        const allowedTypes = opts?.allowedTypes || [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
            'application/zip', 'application/x-zip-compressed',
            'text/plain',
        ];

        if (file.size > maxSize) {
            throw new BadRequestException(`File too large. Max size: ${Math.round(maxSize / 1024 / 1024)}MB`);
        }
        if (!allowedTypes.includes(file.mimetype)) {
            throw new BadRequestException(`File type not allowed: ${file.mimetype}`);
        }
    }
}
