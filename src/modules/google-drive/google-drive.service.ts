import { Injectable, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { retry } from '../../common/utils/retry.util';
import { UploadFailedException } from '../../common/exceptions/upload.exception';

@Injectable()
export class GoogleDriveService implements OnModuleInit {
  private readonly drive;
  private readonly logger = new Logger(GoogleDriveService.name);
  private readonly mainFolderId: string;
  private readonly retryOptions = {
    maxAttempts: 3,
    delay: 1000,
    backoff: 2,
  };

  constructor(private configService: ConfigService) {
    // Get the credentials as a JSON string and parse it
    const credentialsJson = this.configService.get<string>('GOOGLE_CREDENTIALS');
    
    if (!credentialsJson) {
      this.logger.error('GOOGLE_CREDENTIALS environment variable is not set');
      throw new Error('GOOGLE_CREDENTIALS environment variable is not set');
    }

    let credentials;
    try {
      // Try to parse the JSON
      credentials = JSON.parse(credentialsJson);
      
      // Validate required fields
      const requiredFields = ['private_key', 'client_email', 'project_id'];
      for (const field of requiredFields) {
        if (!credentials[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      // Ensure the private key is properly formatted
      if (credentials.private_key) {
        credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
      }
    } catch (error) {
      this.logger.error('Failed to parse Google credentials:', error);
      if (error instanceof SyntaxError) {
        this.logger.error('Invalid JSON format in GOOGLE_CREDENTIALS');
        this.logger.error('Please ensure your credentials are properly formatted and escaped');
      }
      throw new Error('Invalid Google credentials configuration');
    }

    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    this.drive = google.drive({ version: 'v3', auth });
    
    // Get and validate main folder ID
    this.mainFolderId = this.configService.get('GOOGLE_DRIVE_FOLDER_ID');
    
    if (!this.mainFolderId) {
      this.logger.error('GOOGLE_DRIVE_FOLDER_ID is not configured');
      throw new Error('GOOGLE_DRIVE_FOLDER_ID is not configured');
    }

    // Validate folder ID exists and is accessible
    this.validateMainFolder().catch(error => {
      this.logger.error(`Failed to validate main folder: ${error.message}`);
      throw new Error(`Invalid or inaccessible GOOGLE_DRIVE_FOLDER_ID: ${error.message}`);
    });
  }

  private sanitizeFolderName(folderName: string): string {
    // Remove special characters and normalize spaces
    return folderName
      .replace(/[^a-zA-Z0-9-_]/g, '-') // Replace special chars with hyphen
      .replace(/\s+/g, '-')            // Replace spaces with hyphen
      .replace(/-+/g, '-')             // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, '')           // Remove leading/trailing hyphens
      .toLowerCase();                   // Convert to lowercase
  }

  async uploadFile(file: Express.Multer.File, folderName: string): Promise<string> {
    try {
      if (!file || !file.buffer || file.buffer.length === 0) {
        throw new BadRequestException('Invalid file or empty buffer');
      }

      const sanitizedFolderName = this.sanitizeFolderName(folderName);
      this.logger.debug(`Uploading file: ${file.originalname} to folder: ${sanitizedFolderName}`);
      
      const folderId = await this.findOrCreateFolder(sanitizedFolderName);
      
      const fileStream = new Readable();
      fileStream.push(file.buffer);
      fileStream.push(null);

      const safeFileName = `${Date.now()}-${this.sanitizeFolderName(file.originalname)}`;

      const response = await retry(
        async () => {
          return this.drive.files.create({
            requestBody: {
              name: safeFileName,
              mimeType: file.mimetype,
              parents: [folderId],
              // Add this to make the file visible in shared drives
              copyRequiresWriterPermission: false,
            },
            media: {
              mimeType: file.mimetype,
              body: fileStream,
            },
            fields: 'id,webViewLink',
          });
        },
        this.retryOptions
      );

      // Update file permissions to make it visible in Drive
      await this.drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
          allowFileDiscovery: true  // Make the file discoverable
        },
        fields: 'id',
      });

      // Get the updated file with proper sharing URL
      const updatedFile = await this.drive.files.get({
        fileId: response.data.id,
        fields: 'webContentLink,webViewLink'
      });

      // Construct a direct access URL
      const fileId = response.data.id;
      const directUrl = `https://drive.google.com/uc?id=${fileId}&export=download`;

      this.logger.debug('File uploaded successfully:', {
        fileId: fileId,
        directUrl: directUrl
      });

      return directUrl;
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`, error.stack);
      throw new UploadFailedException(
        `Failed to upload file to Google Drive: ${error.message}`,
        'GoogleDrive',
        error
      );
    }
  }

  async updateFile(fileId: string, file: Express.Multer.File): Promise<string> {
    try {
      this.logger.debug(`Attempting to update file with ID: ${fileId}`);

      // Create a readable stream from the file buffer
      const fileStream = new Readable();
      fileStream.push(file.buffer);
      fileStream.push(null);

      // Update the file with retry
      const response = await retry(
        async () => {
          return this.drive.files.update({
            fileId: fileId,
            requestBody: {
              name: `${Date.now()}-${file.originalname}`,
              mimeType: file.mimetype,
            },
            media: {
              mimeType: file.mimetype,
              body: fileStream,
            },
            fields: 'id,webViewLink',
          });
        },
        this.retryOptions
      );

      // Ensure the file is publicly viewable
      await this.drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      return response.data.webViewLink;
    } catch (error) {
      this.logger.error(`Failed to update file: ${error.message}`, error.stack);
      throw new UploadFailedException(
        `Failed to update file in Google Drive: ${error.message}`,
        'GoogleDrive',
        error
      );
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.drive.files.delete({
        fileId: fileId,
      });
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`, error.stack);
      throw new Error(`Failed to delete file from Google Drive: ${error.message}`);
    }
  }

  private async findOrCreateFolder(folderName: string): Promise<string> {
    try {
      const sanitizedFolderName = this.sanitizeFolderName(folderName);
      
      if (!sanitizedFolderName) {
        throw new Error('Invalid folder name');
      }

      // Search for existing folder
      const response = await this.drive.files.list({
        q: `name='${sanitizedFolderName}' and 
            mimeType='application/vnd.google-apps.folder' and 
            '${this.mainFolderId}' in parents and 
            trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive'
      });

      if (response.data.files && response.data.files.length > 0) {
        this.logger.debug(`Found existing folder: ${sanitizedFolderName}`);
        return response.data.files[0].id;
      }

      // Create new folder with enhanced visibility
      const folderMetadata = {
        name: sanitizedFolderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [this.mainFolderId],
        copyRequiresWriterPermission: false
      };

      const folder = await this.drive.files.create({
        requestBody: folderMetadata,
        fields: 'id',
      });

      if (!folder.data.id) {
        throw new Error('Failed to create folder: No folder ID returned');
      }

      // Enhanced folder permissions
      await this.drive.permissions.create({
        fileId: folder.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
          allowFileDiscovery: true
        },
        fields: 'id',
      });

      this.logger.debug(`Created new folder: ${sanitizedFolderName}`);
      return folder.data.id;
    } catch (error) {
      this.logger.error(`Failed to find/create folder: ${error.message}`, error.stack);
      throw new Error(`Failed to find/create folder in Google Drive: ${error.message}`);
    }
  }

  private async diagnoseFolder(folderId: string): Promise<void> {
    try {
      // Get service account email
      const about = await this.drive.about.get({
        fields: 'user'
      });
      this.logger.log('Service Account Email:', about.data.user.emailAddress);

      // Try to list all accessible folders
      const folderList = await this.drive.files.list({
        q: "mimeType='application/vnd.google-apps.folder'",
        fields: 'files(id, name, permissions)',
        spaces: 'drive'
      });

      this.logger.log('Accessible folders:', folderList.data.files.map(f => ({
        id: f.id,
        name: f.name
      })));

      // Try to get specific folder permissions
      try {
        const permissions = await this.drive.permissions.list({
          fileId: folderId,
          fields: 'permissions(emailAddress,role,type)'
        });
        this.logger.log('Folder permissions:', permissions.data.permissions);
      } catch (e) {
        this.logger.error('Could not get folder permissions:', e.message);
      }

    } catch (error) {
      this.logger.error('Diagnosis failed:', error.message);
    }
  }

  async validateMainFolder(): Promise<void> {
    try {
      // Add diagnosis before validation
      await this.diagnoseFolder(this.mainFolderId);

      const folderResponse = await this.drive.files.get({
        fileId: this.mainFolderId,
        fields: 'id, name, mimeType'
      });

      if (folderResponse.data.mimeType !== 'application/vnd.google-apps.folder') {
        throw new Error('Provided ID is not a folder');
      }

      this.logger.log(`Successfully validated main folder: ${folderResponse.data.name}`);
      
    } catch (error) {
      if (error.response?.status === 404) {
        this.logger.error(`Folder not found. Please verify the folder ID: ${this.mainFolderId}`);
        throw new Error(`Folder not found. Please verify the folder ID and ensure it exists.`);
      }
      
      if (error.response?.status === 403) {
        this.logger.error(`Permission denied. Service account might not have access to folder: ${this.mainFolderId}`);
        throw new Error(`Permission denied. Please ensure the service account has access to the folder.`);
      }

      throw error;
    }
  }

  async testConnection(): Promise<void> {
    try {
      // Test basic API access
      const about = await this.drive.about.get({
        fields: 'user'
      });
      
      this.logger.log('Connected as service account:', about.data.user.emailAddress);

      // Test folder access
      await this.validateMainFolder();
      
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      this.logger.error('Google Drive connection test failed:', errorMessage);
      
      if (error.response?.status === 403) {
        throw new Error('Permission denied. Please check service account permissions and folder sharing settings.');
      }
      
      throw error;
    }
  }

  async onModuleInit() {
    await this.testConnection();
  }

  async getUploadUrl(filename: string, folderName: string): Promise<{ uploadUrl: string; webViewLink: string }> {
    try {
      // Get or create the folder
      const folderId = await this.findOrCreateFolder(folderName);

      // Create a new file metadata
      const fileMetadata = {
        name: filename,
        parents: [folderId]
      };

      // Create the file and get the upload URL
      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        fields: 'id, webViewLink'
      });

      // Make the file publicly accessible
      await this.drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      // Generate the upload URL
      const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${response.data.id}?uploadType=media`;

      return {
        uploadUrl,
        webViewLink: response.data.webViewLink
      };
    } catch (error) {
      this.logger.error('Failed to generate upload URL:', error);
      throw new UploadFailedException(
        `Failed to generate upload URL: ${error.message}`,
        'GoogleDrive',
        error
      );
    }
  }
}
