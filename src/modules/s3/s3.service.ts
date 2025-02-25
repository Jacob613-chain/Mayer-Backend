import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { UploadFailedException } from '../../common/exceptions/upload.exception';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly logger = new Logger(S3Service.name);
  private readonly bucket: string;

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      }
    });
    this.bucket = this.configService.get('AWS_BUCKET_NAME');

    this.logger.debug('S3 Configuration:', {
      region: this.configService.get('AWS_REGION'),
      bucket: this.bucket,
      hasCredentials: !!this.configService.get('AWS_ACCESS_KEY_ID')
    });
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    try {
      const key = `${folder}/${Date.now()}-${file.originalname}`;
      
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      );

      // Return the S3 URL
      return `https://${this.bucket}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${key}`;
    } catch (error) {
      this.logger.error(`Failed to upload file to S3: ${error.message}`, error.stack);
      throw new UploadFailedException(
        `Failed to upload file ${file.originalname} to S3`,
        'S3',
        error
      );
    }
  }

  async uploadCompressedFile(
    file: Express.Multer.File,
    folder: string,
    compressedBuffer: Buffer,
    compressedFilename: string
  ): Promise<string> {
    try {
      const key = `${folder}/${Date.now()}-${compressedFilename}`;
      
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: compressedBuffer,
          ContentType: 'image/jpeg', // or 'image/webp' based on compression settings
        })
      );

      return `https://${this.bucket}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${key}`;
    } catch (error) {
      throw new UploadFailedException(
        `Failed to upload compressed file ${compressedFilename} to S3`,
        'S3',
        error
      );
    }
  }
}