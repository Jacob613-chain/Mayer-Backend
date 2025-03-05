import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config();

async function setupDriveFolder() {
    try {
        // Parse credentials
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
        console.log('Using service account:', credentials.client_email);

        const auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/drive']
        });

        const drive = google.drive({ version: 'v3', auth });

        // Create new folder
        const folderResponse = await drive.files.create({
            requestBody: {
                name: 'Site Survey Uploads',
                mimeType: 'application/vnd.google-apps.folder'
            },
            fields: 'id,name,webViewLink'
        });

        const folderId = folderResponse.data.id;
        console.log('Created folder:', folderResponse.data.name);
        console.log('Folder ID:', folderId);
        console.log('Folder Link:', folderResponse.data.webViewLink);

        // Set permissions to allow service account full access
        await drive.permissions.create({
            fileId: folderId,
            requestBody: {
                role: 'writer',
                type: 'user',
                emailAddress: credentials.client_email
            }
        });

        console.log('\nAdd this to your .env file:');
        console.log(`GOOGLE_DRIVE_FOLDER_ID=${folderId}`);

    } catch (error) {
        console.error('Setup failed:', error.message);
        if (error.response?.data?.error) {
            console.error('API Error:', error.response.data.error);
        }
    }
}

setupDriveFolder().catch(console.error);
