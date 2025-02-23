import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp';
}

@Injectable()
export class CompressionService {
  private readonly logger = new Logger(CompressionService.name);
  private readonly defaultOptions: CompressionOptions = {
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 80,
    format: 'jpeg',
  };

  async compressImage(
    file: Express.Multer.File,
    options: Partial<CompressionOptions> = {}
  ): Promise<Buffer> {
    const settings = { ...this.defaultOptions, ...options };

    try {
      let sharpInstance = sharp(file.buffer);

      // Get image metadata
      const metadata = await sharpInstance.metadata();

      // Calculate new dimensions while maintaining aspect ratio
      if (metadata.width && metadata.height) {
        const aspectRatio = metadata.width / metadata.height;
        let newWidth = metadata.width;
        let newHeight = metadata.height;

        if (newWidth > settings.maxWidth) {
          newWidth = settings.maxWidth;
          newHeight = Math.round(newWidth / aspectRatio);
        }

        if (newHeight > settings.maxHeight) {
          newHeight = settings.maxHeight;
          newWidth = Math.round(newHeight * aspectRatio);
        }

        sharpInstance = sharpInstance.resize(newWidth, newHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Apply compression based on format
      if (settings.format === 'webp') {
        return await sharpInstance
          .webp({ quality: settings.quality })
          .toBuffer();
      } else {
        return await sharpInstance
          .jpeg({ quality: settings.quality, mozjpeg: true })
          .toBuffer();
      }
    } catch (error) {
      this.logger.error(
        `Failed to compress image ${file.originalname}: ${error.message}`
      );
      throw error;
    }
  }

  async compressImageBatch(
    files: Express.Multer.File[],
    options?: Partial<CompressionOptions>
  ): Promise<{ buffer: Buffer; originalname: string }[]> {
    const compressedFiles = await Promise.all(
      files.map(async (file) => {
        const buffer = await this.compressImage(file, options);
        const extension = options?.format || 'jpeg';
        const originalname = `${file.originalname.split('.')[0]}.${extension}`;
        return { buffer, originalname };
      })
    );

    return compressedFiles;
  }
} 