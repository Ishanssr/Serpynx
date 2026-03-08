import { Controller, Post, Delete, Get, Param, UseGuards, Request, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { FilesService } from './files.service';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { Role } from '@prisma/client';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('api/work-parts/:workPartId/files')
export class FilesController {
    constructor(private filesService: FilesService) { }

    @Post()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(Role.FREELANCER)
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: './uploads/work-files',
                filename: (req, file, cb) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
                },
            }),
            fileFilter: (req, file, cb) => {
                // Allow common file types for work proofs
                const allowedMimes = [
                    'image/jpeg',
                    'image/png',
                    'image/gif',
                    'application/pdf',
                    'text/plain',
                    'application/zip',
                    'application/x-zip-compressed',
                    'video/mp4',
                    'video/quicktime',
                ];
                
                if (allowedMimes.includes(file.mimetype)) {
                    cb(null, true);
                } else {
                    cb(new Error('Invalid file type. Allowed types: images, PDF, text, zip, and video files.'), false);
                }
            },
            limits: {
                fileSize: 50 * 1024 * 1024, // 50MB limit
            },
        }),
    )
    uploadFile(
        @Param('workPartId') workPartId: string,
        @Request() req,
        @UploadedFile() file: Express.Multer.File,
    ) {
        return this.filesService.uploadWorkFile(workPartId, req.user.id, file);
    }

    @Get()
    @UseGuards(AuthGuard('jwt'))
    getFiles(@Param('workPartId') workPartId: string, @Request() req) {
        return this.filesService.getWorkFiles(workPartId, req.user.id);
    }

    @Delete(':fileId')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(Role.FREELANCER)
    deleteFile(
        @Param('workPartId') workPartId: string,
        @Param('fileId') fileId: string,
        @Request() req,
    ) {
        return this.filesService.deleteWorkFile(fileId, req.user.id);
    }
}
