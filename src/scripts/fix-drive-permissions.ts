import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config();

async function fixDrivePermissions() {
    try {
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

        if (!folderId) {
            throw new Error('GOOGLE_DRIVE_FOLDER_ID is not set in environment variables');
        }

        const auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/drive']
        });

        const drive = google.drive({ version: 'v3', auth });

        // First, update the main folder's permissions
        console.log('Updating main folder permissions...');
        try {
            await drive.permissions.create({
                fileId: folderId,
                requestBody: {
                    role: 'reader',
                    type: 'anyone'
                },
                fields: 'id'
            });
            console.log('Main folder permissions updated successfully');
        } catch (error) {
            console.error('Failed to update main folder permissions:', error.message);
        }

        // Get all files in the main folder and subfolders
        console.log('Fetching files...');
        const files = await drive.files.list({
            q: `'${folderId}' in parents`,
            fields: 'files(id, name, mimeType, permissions)',
            spaces: 'drive'
        });

        console.log(`Found ${files.data.files?.length || 0} files/folders to update`);

        // Update permissions for each file/folder
        for (const file of files.data.files || []) {
            try {
                // Check existing permissions first
                const permissions = await drive.permissions.list({
                    fileId: file.id,
                    fields: 'permissions(id,type,role)'
                });

                // Check if 'anyone' permission already exists
                const anyonePermission = permissions.data.permissions?.find(p => p.type === 'anyone');
                
                if (!anyonePermission) {
                    // Create new permission if it doesn't exist
                    await drive.permissions.create({
                        fileId: file.id,
                        requestBody: {
                            role: 'reader',
                            type: 'anyone'
                        },
                        fields: 'id'
                    });
                    console.log(`Created new permissions for: ${file.name}`);
                } else {
                    console.log(`Permissions already set for: ${file.name}`);
                }
            } catch (error) {
                console.error(`Failed to update permissions for ${file.name}:`, error.message);
            }
        }

        console.log('Permissions update completed');

    } catch (error) {
        console.error('Permission update failed:', error.message);
        // Log more details about the error
        if (error.response?.data?.error) {
            console.error('Detailed error:', JSON.stringify(error.response.data.error, null, 2));
        }
    }
}

fixDrivePermissions().catch(console.error);
