export class UploadFailedException extends Error {
  constructor(
    message: string,
    public readonly service: 'GoogleDrive',
    public readonly originalError: Error
  ) {
    super(message);
    this.name = 'UploadFailedException';
  }
}

export class FolderCreationException extends Error {
  constructor(
    message: string,
    public readonly service: 'GoogleDrive',
    public readonly originalError: Error
  ) {
    super(message);
    this.name = 'FolderCreationException';
  }
} 
