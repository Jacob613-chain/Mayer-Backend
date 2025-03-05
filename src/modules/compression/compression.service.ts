import { Injectable, Logger, BadRequestException } from '@nestjs/common';
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
      // Validate file input
      if (!file || !file.buffer) {
        throw new BadRequestException('No file or empty file provided');
      }

      // Validate file size
      if (file.size === 0) {
        throw new BadRequestException('File is empty');
      }

      // Validate mime type
      if (!file.mimetype.startsWith('image/')) {
        throw new BadRequestException('File is not an image');
      }

      // Create sharp instance with detailed error handling
      let sharpInstance: sharp.Sharp;
      try {
        sharpInstance = sharp(file.buffer, {
          failOnError: true,
          animated: false // Disable animated image support
        });
      } catch (error) {
        this.logger.error(`Sharp initialization failed: ${error.message}`);
        throw new BadRequestException(`Invalid image format: ${error.message}`);
      }

      // Validate image metadata
      const metadata = await sharpInstance.metadata().catch(error => {
        this.logger.error(`Metadata extraction failed: ${error.message}`);
        throw new BadRequestException(`Failed to read image metadata: ${error.message}`);
      });

      if (!metadata || !metadata.format) {
        throw new BadRequestException('Unable to determine image format');
      }

      // Process the image with proper error handling
      return await sharpInstance
        .rotate() // Auto-rotate based on EXIF data
        .resize({
          width: settings.maxWidth,
          height: settings.maxHeight,
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ 
          quality: settings.quality,
          mozjpeg: true,
          force: settings.format === 'jpeg'
        })
        .toBuffer()
        .catch(error => {
          this.logger.error(`Image processing failed: ${error.message}`);
          throw new BadRequestException(`Failed to process image: ${error.message}`);
        });

    } catch (error) {
      this.logger.error(
        `Image compression failed for ${file.originalname}: ${error.message}`,
        error.stack
      );
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException(
        'Failed to process image. Please ensure it is a valid image file and try again.'
      );
    }
  }

  async compressImageBatch(
    files: Express.Multer.File[],
    options?: Partial<CompressionOptions>
  ): Promise<{ buffer: Buffer; originalname: string }[]> {
    if (!Array.isArray(files) || files.length === 0) {
      throw new BadRequestException('No files provided for batch compression');
    }

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
