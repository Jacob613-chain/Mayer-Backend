import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3 } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';

@Injectable()
export class S3Service {
  private readonly s3: S3;
  private readonly logger = new Logger(S3Service.name);
  private readonly bucketName: string;
  private readonly endpoint: string;

  constructor(private configService: ConfigService) {
    this.bucketName = 'sitesurvey-images.mayersolar.com';
    this.endpoint = 'https://s3.us-central-1.wasabisys.com';
    
    this.s3 = new S3({
      endpoint: this.endpoint,
      accessKeyId: '91YKKZQZRAVR0W2TKE91',
      secretAccessKey: 'loBkTFzCPuieXVHVsJuCEgUKBRalC1mYY1Bau0jC',
      s3ForcePathStyle: true,
      region: 'us-central-1',
      signatureVersion: 'v4'
    });
  }

  async uploadFile(file: Express.Multer.File, path: string): Promise<string> {
    try {
      const fileExtension = file.originalname.split('.').pop();
      const fileName = `${path}/${uuidv4()}.${fileExtension}`;

      await this.s3.putObject({
        Bucket: this.bucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
        CacheControl: 'max-age=31536000'
      }).promise();

      // Return the full S3 URL
      return `${this.endpoint}/${this.bucketName}/${fileName}`;
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      throw error;
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract the key from the full URL
      const key = fileUrl.split(`${this.bucketName}/`)[1];
      
      if (!key) {
        throw new Error(`Invalid file URL format: ${fileUrl}`);
      }

      await this.s3.deleteObject({
        Bucket: this.bucketName,
        Key: key
      }).promise();

      this.logger.debug(`Successfully deleted file: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`);
      throw error;
    }
  }

  getFullUrl(fileUrl: string): string {
    // If it's already a full URL, return it as is
    if (fileUrl.startsWith('http')) {
      return fileUrl;
    }
    // Otherwise, construct the full URL
    return `${this.endpoint}/${this.bucketName}/${fileUrl}`;
  }

  async getFileStream(key: string): Promise<Readable> {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: key,
      };

      const response = await this.s3.getObject(params).promise();
      const stream = new Readable();
      stream.push(response.Body);
      stream.push(null);
      
      return stream;
    } catch (error) {
      this.logger.error(`Failed to get file stream for ${key}: ${error.message}`);
      throw error;
    }
  }
}
