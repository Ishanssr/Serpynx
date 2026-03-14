import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FilesService {
  constructor(private prisma: PrismaService) {}

  async uploadWorkFile(
    workPartId: string,
    freelancerId: string,
    file: Express.Multer.File,
  ) {
    // Verify work part exists and user has access
    const workPart = await this.prisma.workPart.findUnique({
      where: { id: workPartId },
      include: { Task: true },
    });

    if (!workPart) throw new NotFoundException('Work part not found');
    if (!workPart.Task) throw new NotFoundException('Task not found');
    if (workPart.Task.assignedToId !== freelancerId && workPart.Task.clientId !== freelancerId) {
      throw new ForbiddenException('Not authorized to upload files to this work part');
    }

    return this.prisma.workFile.create({
      data: {
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        workPartId,
        uploaderId: freelancerId,
      },
    });
  }

  async getWorkFiles(workPartId: string, userId: string) {
    const workPart = await this.prisma.workPart.findUnique({
      where: { id: workPartId },
      include: { Task: true },
    });

    if (!workPart) throw new NotFoundException('Work part not found');
    if (!workPart.Task) throw new NotFoundException('Task not found');
    if (workPart.Task.assignedToId !== userId && workPart.Task.clientId !== userId) {
      throw new ForbiddenException('Not authorized to view files');
    }

    const files = await this.prisma.workFile.findMany({
      where: { workPartId },
      include: { User: { select: { id: true, name: true } } },
      orderBy: { uploadedAt: 'desc' },
    });

    return files.map(f => ({
      ...f,
      uploader: f.User,
      User: undefined,
      url: `/uploads/work-files/${f.filename}`,
    }));
  }

  async deleteWorkFile(fileId: string, userId: string) {
    const file = await this.prisma.workFile.findUnique({
      where: { id: fileId },
    });

    if (!file) throw new NotFoundException('File not found');
    if (file.uploaderId !== userId) {
      throw new ForbiddenException('Only the uploader can delete this file');
    }

    // Delete from disk
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (err) {
      console.error('Failed to delete file from disk:', err);
    }

    await this.prisma.workFile.delete({ where: { id: fileId } });
    return { message: 'File deleted successfully' };
  }
}
