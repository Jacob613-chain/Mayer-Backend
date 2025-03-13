import { Controller, Get, Param, Res, Logger, Header, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { S3Service } from './s3.service';

@Controller('files')
export class S3Controller {
  private readonly logger = new Logger(S3Controller.name);

  constructor(private readonly s3Service: S3Service) {}

  @Get('*')
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Access-Control-Allow-Methods', 'GET')
  @Header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  async serveFile(@Param('0') filePath: string, @Res() res: Response): Promise<void> {
    try {
      const fileStream = await this.s3Service.getFileStream(filePath);
      
      // Handle stream errors
      fileStream.on('error', (error) => {
        this.logger.error(`Stream error for file ${filePath}: ${error.message}`);
        if (!res.headersSent) {
          res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Error streaming file');
        }
      });

      // Set appropriate headers
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filePath)}"`);
      
      // Pipe the stream and handle completion
      fileStream.pipe(res).on('finish', () => {
        if (!res.headersSent) {
          res.end();
        }
      });
    } catch (error) {
      this.logger.error(`Failed to serve file ${filePath}: ${error.message}`);
      if (!res.headersSent) {
        res.status(HttpStatus.NOT_FOUND).send('File not found');
      }
    }
  }
}