import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class FilesService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  async uploadWorkFile(
    workPartId: string,
    userId: string,
    file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');

    const workPart = await this.prisma.workPart.findUnique({
      where: { id: workPartId },
      include: { Task: true },
    });

    if (!workPart) throw new NotFoundException('Work part not found');
    if (!workPart.Task) throw new NotFoundException('Task not found');
    if (workPart.Task.assignedToId !== userId && workPart.Task.clientId !== userId) {
      throw new ForbiddenException('Not authorized to upload files to this work part');
    }

    // Upload to Cloudinary
    let fileUrl: string;
    let publicId: string;
    try {
      const result = await this.cloudinary.upload(file, 'work-files');
      fileUrl = result.url;
      publicId = result.publicId;
    } catch (err) {
      throw new BadRequestException('File upload failed. Please check Cloudinary configuration.');
    }

    return this.prisma.workFile.create({
      data: {
        filename: file.originalname,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: fileUrl,
        workPartId,
        uploaderId: userId,
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
      // path now stores the full Cloudinary URL
      url: f.path,
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

    // Delete from Cloudinary if it's a Cloudinary URL
    if (file.path.includes('cloudinary')) {
      this.cloudinary.delete(file.path).catch(() => {});
    }

    await this.prisma.workFile.delete({ where: { id: fileId } });
    return { message: 'File deleted successfully' };
  }
}
