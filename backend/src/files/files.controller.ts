import { Controller, Post, Delete, Get, Param, UseGuards, Request, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { FilesService } from './files.service';
import { memoryStorage } from 'multer';

@Controller('api/work-parts/:workPartId/files')
export class FilesController {
    constructor(private filesService: FilesService) { }

    @Post()
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            fileFilter: (req, file, cb) => {
                const allowedMimes = [
                    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                    'application/pdf', 'text/plain',
                    'application/zip', 'application/x-zip-compressed',
                    'video/mp4', 'video/quicktime',
                ];
                cb(null, allowedMimes.includes(file.mimetype));
            },
            limits: { fileSize: 50 * 1024 * 1024 },
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
    @UseGuards(AuthGuard('jwt'))
    deleteFile(
        @Param('workPartId') workPartId: string,
        @Param('fileId') fileId: string,
        @Request() req,
    ) {
        return this.filesService.deleteWorkFile(fileId, req.user.id);
    }
}
