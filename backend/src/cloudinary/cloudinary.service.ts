import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
    private readonly logger = new Logger(CloudinaryService.name);
    private configured = false;

    constructor() {
        const cloud = process.env.CLOUDINARY_CLOUD_NAME;
        const key = process.env.CLOUDINARY_API_KEY;
        const secret = process.env.CLOUDINARY_API_SECRET;

        if (cloud && key && secret) {
            cloudinary.config({ cloud_name: cloud, api_key: key, api_secret: secret });
            this.configured = true;
            this.logger.log('Cloudinary configured successfully');
        } else {
            this.logger.warn('Cloudinary not configured — files will use local disk (ephemeral on Render)');
        }
    }

    isConfigured(): boolean {
        return this.configured;
    }

    async upload(file: Express.Multer.File, folder: string): Promise<{ url: string, publicId: string }> {
        if (!this.configured) {
            throw new Error('Cloudinary not configured');
        }

        return new Promise((resolve, reject) => {
            const resourceType = file.mimetype.startsWith('image/') ? 'image' : 'raw';
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: `serpynx/${folder}`,
                    resource_type: resourceType,
                    use_filename: true,
                    unique_filename: true,
                },
                (error, result: UploadApiResponse) => {
                    if (error) return reject(error);
                    resolve({ url: result.secure_url, publicId: result.public_id });
                },
            );

            const stream = new Readable();
            stream.push(file.buffer);
            stream.push(null);
            stream.pipe(uploadStream);
        });
    }

    async delete(publicId: string): Promise<void> {
        if (!this.configured) return;
        try {
            await cloudinary.uploader.destroy(publicId);
        } catch (err) {
            this.logger.error(`Failed to delete from Cloudinary: ${publicId}`, err);
        }
    }
}
