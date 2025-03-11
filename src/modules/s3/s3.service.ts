import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3 } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private readonly s3: S3;
  private readonly logger = new Logger(S3Service.name);
  private readonly bucketName: string;

  constructor(private configService: ConfigService) {
    this.bucketName = 'sitesurvey-images.mayersolar.com';
    
    this.s3 = new S3({
      endpoint: 'https://s3.us-central-1.wasabisys.com',
      accessKeyId: '91YKKZQZRAVR0W2TKE91',
      secretAccessKey: 'loBkTFzCPuieXVHVsJuCEgUKBRalC1mYY1Bau0jC',
      s3ForcePathStyle: true,
      region: 'us-central-1'
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
        ACL: 'public-read'
      }).promise();

      return `https://s3.us-central-1.wasabisys.com/${this.bucketName}/${fileName}`;
    } catch (error) {
      this.logger.error(`Failed to upload file to S3: ${error.message}`);
      throw error;
    }
  }

  async uploadDealerLogo(dealerId: string, file: Express.Multer.File): Promise<string> {
    return this.uploadFile(file, `dealers/${dealerId}`);
  }

  async uploadSurveyImage(responseId: string, file: Express.Multer.File): Promise<string> {
    return this.uploadFile(file, `responses/${responseId}`);
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const key = fileUrl.split(this.bucketName + '/')[1];
      
      await this.s3.deleteObject({
        Bucket: this.bucketName,
        Key: key
      }).promise();
    } catch (error) {
      this.logger.error(`Failed to delete file from S3: ${error.message}`);
      throw error;
    }
  }
}