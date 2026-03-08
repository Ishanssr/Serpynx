import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Express } from 'express';

@Injectable()
export class FilesService {
    constructor(private prisma: PrismaService) {}

    async uploadWorkFile(
        workPartId: string,
        freelancerId: string,
        file: Express.Multer.File,
    ) {
        const workPart = await this.prisma.workPart.findUnique({
            where: { id: workPartId },
            include: {
                task: true,
                submission: {
                    include: { task: true },
                },
            },
        });

        if (!workPart) throw new NotFoundException('Work part not found');
        
        // Check permissions - work part can be linked to task or submission
        let hasPermission = false;
        if (workPart.submission) {
            hasPermission = workPart.submission.freelancerId === freelancerId;
        } else if (workPart.task) {
            // For task-linked work parts, check if the freelancer is assigned to the task
            const assignedBid = await this.prisma.bid.findFirst({
                where: {
                    taskId: workPart.task.id,
                    freelancerId: freelancerId,
                    status: 'ACCEPTED'
                }
            });
            hasPermission = !!assignedBid;
        }
        
        if (!hasPermission) {
            throw new ForbiddenException('You are not assigned to this task');
        }

        // Generate unique filename
        const uniqueFilename = `${Date.now()}-${file.originalname}`;
        const filePath = `uploads/work-files/${uniqueFilename}`;

        // Create file record in database
        const workFile = await this.prisma.workFile.create({
            data: {
                filename: uniqueFilename,
                originalName: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                path: filePath,
                workPartId,
            },
        });

        return {
            id: workFile.id,
            filename: workFile.originalName,
            size: workFile.size,
            mimeType: workFile.mimeType,
            uploadedAt: workFile.uploadedAt,
        };
    }

    async deleteWorkFile(fileId: string, freelancerId: string) {
        const workFile = await this.prisma.workFile.findUnique({
            where: { id: fileId },
            include: {
                workPart: {
                    include: {
                        task: true,
                        submission: true,
                    },
                },
            },
        });

        if (!workFile) throw new NotFoundException('File not found');
        
        // Check permissions
        let hasPermission = false;
        if (workFile.workPart.submission) {
            hasPermission = workFile.workPart.submission.freelancerId === freelancerId;
        } else if (workFile.workPart.task) {
            // For task-linked work parts, check if the freelancer is assigned to the task
            const assignedBid = await this.prisma.bid.findFirst({
                where: {
                    taskId: workFile.workPart.task.id,
                    freelancerId: freelancerId,
                    status: 'ACCEPTED'
                }
            });
            hasPermission = !!assignedBid;
        }
        
        if (!hasPermission) {
            throw new ForbiddenException('You are not authorized to delete this file');
        }

        await this.prisma.workFile.delete({
            where: { id: fileId },
        });

        // TODO: Delete actual file from filesystem
        // This would require fs operations

        return { message: 'File deleted successfully' };
    }

    async getWorkFiles(workPartId: string, userId: string) {
        const workPart = await this.prisma.workPart.findUnique({
            where: { id: workPartId },
            include: {
                task: true,
                submission: {
                    include: { task: true },
                },
                files: true,
            },
        });

        if (!workPart) throw new NotFoundException('Work part not found');

        // Check if user is either the client or the freelancer
        let isClient = false;
        let isFreelancer = false;
        
        if (workPart.submission) {
            isClient = workPart.submission.task.clientId === userId;
            isFreelancer = workPart.submission.freelancerId === userId;
        } else if (workPart.task) {
            // For task-linked work parts, check if user is client or assigned freelancer
            isClient = workPart.task.clientId === userId;
            const assignedBid = await this.prisma.bid.findFirst({
                where: {
                    taskId: workPart.task.id,
                    freelancerId: userId,
                    status: 'ACCEPTED'
                }
            });
            isFreelancer = !!assignedBid;
        }

        if (!isClient && !isFreelancer) {
            throw new ForbiddenException('You are not authorized to view these files');
        }

        return workPart.files.map(file => ({
            id: file.id,
            filename: file.originalName,
            size: file.size,
            mimeType: file.mimeType,
            uploadedAt: file.uploadedAt,
        }));
    }
}
