import {
    Controller,
    Post,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    Request,
    BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import { UploadsService } from './uploads.service';

const storage = diskStorage({
    destination: './uploads',
    filename: (_req, file, cb) => {
        const uniqueName = `${uuid()}${extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: any) => {
    const allowed = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/zip',
        'application/x-zip-compressed', 'text/plain',
    ];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new BadRequestException(`File type not allowed: ${file.mimetype}`), false);
    }
};

@UseGuards(AuthGuard('jwt'))
@Controller('api/uploads')
export class UploadsController {
    constructor(private uploadsService: UploadsService) { }

    @Post('avatar')
    @UseInterceptors(FileInterceptor('file', {
        storage,
        fileFilter,
        limits: { fileSize: 2 * 1024 * 1024 }, // 2MB for avatars
    }))
    async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Request() req) {
        if (!file) throw new BadRequestException('No file uploaded');
        this.uploadsService.validateFile(file, {
            maxSize: 2 * 1024 * 1024,
            allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        });
        return this.uploadsService.updateAvatar(req.user.id, file.filename);
    }

    @Post('file')
    @UseInterceptors(FileInterceptor('file', {
        storage,
        fileFilter,
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for general files
    }))
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('No file uploaded');
        this.uploadsService.validateFile(file, { maxSize: 10 * 1024 * 1024 });
        return {
            filename: file.filename,
            originalName: file.originalname,
            url: this.uploadsService.getFileUrl(file.filename),
            size: file.size,
            mimetype: file.mimetype,
        };
    }
}
