import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config();

async function verifyDrivePermissions() {
    try {
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

        const auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/drive']
        });

        const drive = google.drive({ version: 'v3', auth });

        // Check main folder permissions
        const folder = await drive.files.get({
            fileId: folderId,
            fields: 'permissions'
        });

        // Ensure public access
        await drive.permissions.create({
            fileId: folderId,
            requestBody: {
                role: 'reader',
                type: 'anyone'
            },
            fields: 'id'
        });

        console.log('Permissions verified and updated successfully');

    } catch (error) {
        console.error('Permission verification failed:', error.message);
    }
}

verifyDrivePermissions().catch(console.error);