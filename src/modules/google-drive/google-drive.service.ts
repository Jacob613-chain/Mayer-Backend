import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { retry } from '../../common/utils/retry.util';
import { UploadFailedException, FolderCreationException } from '../../common/exceptions/upload.exception';

@Injectable()
export class GoogleDriveService {
  private readonly drive;
  private readonly logger = new Logger(GoogleDriveService.name);
  private readonly mainFolderId: string;
  private readonly retryOptions = {
    maxAttempts: 3,
    delay: 1000,
    backoff: 2,
  };

  constructor(private configService: ConfigService) {
    // Log configuration (without exposing private key)
    this.logger.debug('Google Drive Configuration:', {
      clientEmail: this.configService.get('GOOGLE_CLIENT_EMAIL'),
      hasPrivateKey: !!this.configService.get('GOOGLE_PRIVATE_KEY'),
      folderId: this.configService.get('GOOGLE_DRIVE_FOLDER_ID')
    });

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: this.configService.get('GOOGLE_CLIENT_EMAIL'),
        private_key: this.configService.get('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    this.drive = google.drive({ version: 'v3', auth });
    this.mainFolderId = this.configService.get('GOOGLE_DRIVE_FOLDER_ID');

    if (!this.mainFolderId) {
      throw new Error('GOOGLE_DRIVE_FOLDER_ID is not configured');
    }
  }

  async uploadFile(file: Express.Multer.File, customerFolder: string): Promise<string> {
    try {
      this.logger.debug(`Attempting to upload file: ${file.originalname} to folder: ${customerFolder}`);
      
      const folderId = await this.findOrCreateFolder(customerFolder);
      this.logger.debug(`Using folder ID: ${folderId}`);

      // Create a readable stream from the file buffer
      const fileStream = new Readable();
      fileStream.push(file.buffer);
      fileStream.push(null);

      // Upload the file with retry
      const response = await retry(
        async () => {
          return this.drive.files.create({
            requestBody: {
              name: `${Date.now()}-${file.originalname}`,
              mimeType: file.mimetype,
              parents: [folderId],
            },
            media: {
              mimeType: file.mimetype,
              body: fileStream,
            },
            fields: 'id,webViewLink',
          });
        },
        this.retryOptions,
        (error, attempt) => {
          this.logger.warn(
            `Retry attempt ${attempt} for file upload: ${file.originalname}`,
            error.message
          );
        }
      );

      return response.data.webViewLink;
    } catch (error) {
      this.logger.error(`Upload failed: ${error.message}`, error.stack);
      throw new UploadFailedException(
        `Failed to upload file ${file.originalname} to Google Drive`,
        'GoogleDrive',
        error
      );
    }
  }

  private async findOrCreateFolder(folderName: string): Promise<string> {
    try {
      // Check if folder exists with retry
      const existingFolder = await retry(
        async () => {
          const response = await this.drive.files.list({
            q: `name = '${folderName}' and '${this.mainFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id)',
          });
          return response.data.files[0]?.id;
        },
        this.retryOptions,
        (error, attempt) => {
          this.logger.warn(
            `Retry attempt ${attempt} for folder search: ${folderName}`,
            error.message
          );
        }
      );

      if (existingFolder) {
        return existingFolder;
      }

      // Create new folder with retry
      const folderResponse = await retry(
        async () => {
          return this.drive.files.create({
            requestBody: {
              name: folderName,
              mimeType: 'application/vnd.google-apps.folder',
              parents: [this.mainFolderId],
            },
            fields: 'id',
          });
        },
        this.retryOptions,
        (error, attempt) => {
          this.logger.warn(
            `Retry attempt ${attempt} for folder creation: ${folderName}`,
            error.message
          );
        }
      );

      return folderResponse.data.id;
    } catch (error) {
      throw new FolderCreationException(
        `Failed to find/create folder: ${folderName}`,
        'GoogleDrive',
        error
      );
    }
  }

  async createBatchUpload(files: Express.Multer.File[], customerFolder: string): Promise<string[]> {
    const results: string[] = [];
    const errors: Error[] = [];

    // Process files in batches of 3 to avoid overwhelming the API
    const batchSize = 3;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchPromises = batch.map(async (file) => {
        try {
          const link = await this.uploadFile(file, customerFolder);
          results.push(link);
        } catch (error) {
          errors.push(error);
          this.logger.error(
            `Failed to upload file ${file.originalname}: ${error.message}`
          );
        }
      });

      await Promise.all(batchPromises);
    }

    if (errors.length > 0) {
      this.logger.error(`${errors.length} files failed to upload`);
      // You might want to handle partial failures according to your needs
      // For now, we'll throw an error if any file failed
      throw new UploadFailedException(
        `Failed to upload ${errors.length} files`,
        'GoogleDrive',
        errors[0]
      );
    }

    return results;
  }

  async uploadCompressedFile(
    file: Express.Multer.File,
    customerFolder: string,
    compressedBuffer: Buffer,
    compressedFilename: string
  ): Promise<string> {
    try {
      const folderId = await this.findOrCreateFolder(customerFolder);

      // Create a readable stream from the compressed buffer
      const fileStream = new Readable();
      fileStream.push(compressedBuffer);
      fileStream.push(null);

      const response = await retry(
        async () => {
          return this.drive.files.create({
            requestBody: {
              name: `${Date.now()}-${compressedFilename}`,
              mimeType: 'image/jpeg', // or 'image/webp' based on compression settings
              parents: [folderId],
            },
            media: {
              mimeType: 'image/jpeg', // or 'image/webp'
              body: fileStream,
            },
            fields: 'id,webViewLink',
          });
        },
        this.retryOptions,
        (error, attempt) => {
          this.logger.warn(
            `Retry attempt ${attempt} for compressed file upload: ${compressedFilename}`,
            error.message
          );
        }
      );

      return response.data.webViewLink;
    } catch (error) {
      throw new UploadFailedException(
        `Failed to upload compressed file ${compressedFilename} to Google Drive`,
        'GoogleDrive',
        error
      );
    }
  }
} 
