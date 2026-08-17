const { google } = require('googleapis');
const { Readable } = require('stream');

let cachedFolderId = null;

/**
 * Initializes and returns an OAuth2 client configured with system credentials.
 */
function getOAuth2Client() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
        throw new Error('Google Drive API credentials (CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN) are missing in .env');
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return oauth2Client;
}

/**
 * Returns an authenticated Google Drive API v3 instance.
 */
function getDriveClient() {
    const auth = getOAuth2Client();
    return google.drive({ version: 'v3', auth });
}

/**
 * Ensures the target folder ('ServerUploads') exists in Google Drive.
 * Uses GOOGLE_DRIVE_FOLDER_ID from .env if specified, otherwise auto-creates it.
 */
async function ensureAppFolder() {
    if (process.env.GOOGLE_DRIVE_FOLDER_ID && process.env.GOOGLE_DRIVE_FOLDER_ID.trim() !== '') {
        return process.env.GOOGLE_DRIVE_FOLDER_ID.trim();
    }

    if (cachedFolderId) {
        return cachedFolderId;
    }

    const drive = getDriveClient();
    const folderName = 'ServerUploads';

    // Search for existing folder
    const searchRes = await drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive',
    });

    if (searchRes.data.files && searchRes.data.files.length > 0) {
        cachedFolderId = searchRes.data.files[0].id;
        return cachedFolderId;
    }

    // Create folder if it doesn't exist
    const createRes = await drive.files.create({
        requestBody: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
    });

    cachedFolderId = createRes.data.id;
    console.log(`📁 Created new Google Drive folder '${folderName}' with ID: ${cachedFolderId}`);
    return cachedFolderId;
}

const userFolderCache = {};

/**
 * Ensures a user-specific subfolder (named `${userId}`) exists inside the main ServerUploads folder on Google Drive.
 * 
 * @param {string} userId User ID string
 * @returns {Promise<string>} Google Drive Folder ID for the user
 */
async function ensureUserFolder(userId) {
    if (!userId) return await ensureAppFolder();

    const userIdStr = String(userId);
    if (userFolderCache[userIdStr]) {
        return userFolderCache[userIdStr];
    }

    const drive = getDriveClient();
    const parentFolderId = await ensureAppFolder();

    // Search for existing subfolder named userId under parentFolderId
    const searchRes = await drive.files.list({
        q: `name='${userIdStr}' and mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive',
    });

    if (searchRes.data.files && searchRes.data.files.length > 0) {
        userFolderCache[userIdStr] = searchRes.data.files[0].id;
        return userFolderCache[userIdStr];
    }

    // Create user subfolder
    const createRes = await drive.files.create({
        requestBody: {
            name: userIdStr,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentFolderId],
        },
        fields: 'id',
    });

    userFolderCache[userIdStr] = createRes.data.id;
    console.log(`📁 Created Google Drive subfolder for user '${userIdStr}' with ID: ${userFolderCache[userIdStr]}`);
    return userFolderCache[userIdStr];
}

/**
 * Uploads a file (from stream or buffer) directly to Google Drive inside a user-specific subfolder.
 * 
 * @param {Readable|Buffer} fileSource Stream or memory buffer of the file.
 * @param {string} driveStorageName Name on Drive (e.g., `${userId}_${fileUuid}${ext}`)
 * @param {string} mimeType File MIME type
 * @param {string} [userId] Optional User ID to store in user's subfolder
 * @returns {Promise<{ driveFileId: string, size: number }>}
 */
async function uploadToDrive(fileSource, driveStorageName, mimeType, userId = null) {
    const drive = getDriveClient();
    const folderId = userId ? await ensureUserFolder(userId) : await ensureAppFolder();

    let mediaBody;
    if (Buffer.isBuffer(fileSource)) {
        mediaBody = Readable.from(fileSource);
    } else if (typeof fileSource.pipe === 'function') {
        mediaBody = fileSource;
    } else {
        throw new Error('Invalid fileSource provided to uploadToDrive: expected Stream or Buffer');
    }

    const response = await drive.files.create({
        requestBody: {
            name: driveStorageName,
            parents: [folderId],
        },
        media: {
            mimeType: mimeType,
            body: mediaBody,
        },
        fields: 'id, size',
    });

    return {
        driveFileId: response.data.id,
        size: response.data.size ? parseInt(response.data.size, 10) : 0,
    };
}

/**
 * Retrieves file metadata from Google Drive.
 */
async function getDriveFileMetadata(driveFileId) {
    const drive = getDriveClient();
    const res = await drive.files.get({
        fileId: driveFileId,
        fields: 'id, name, mimeType, size',
    });
    return res.data;
}

/**
 * Returns a readable stream for a file stored on Google Drive.
 * Uses Node's built-in https module to make a direct HTTP request with
 * proper Authorization and Range headers — the googleapis client doesn't
 * reliably forward Range headers for partial content.
 * 
 * @param {string} driveFileId Google Drive file ID
 * @param {string} [rangeHeader] Optional HTTP Range header (e.g., "bytes=0-1024")
 * @returns {Promise<{ stream: Readable, headers: object, status: number }>}
 */
async function getFileStreamFromDrive(driveFileId, rangeHeader) {
    const https = require('https');
    const auth = getOAuth2Client();
    const tokenResponse = await auth.getAccessToken();
    const accessToken = tokenResponse.token || tokenResponse.res?.data?.access_token;

    const url = `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`;

    const headers = {
        'Authorization': `Bearer ${accessToken}`,
    };
    if (rangeHeader) {
        headers['Range'] = rangeHeader;
    }

    console.log(`  ☁️  [DRIVE] Fetching ┃ ${driveFileId.substring(0, 12)}... ┃ ${rangeHeader || 'full file'}`);

    return new Promise((resolve, reject) => {
        https.get(url, { headers }, (response) => {
            // Follow redirects (Google sometimes 302s to a CDN)
            if (response.statusCode === 302 || response.statusCode === 301) {
                const redirectUrl = response.headers.location;
                console.log(`  ☁️  [DRIVE] Redirect ┃ ${redirectUrl.substring(0, 60)}...`);
                https.get(redirectUrl, { headers: rangeHeader ? { 'Range': rangeHeader } : {} }, (redirectResponse) => {
                    console.log(`  ☁️  [DRIVE] Response ┃ ${redirectResponse.statusCode} ┃ ${redirectResponse.headers['content-length'] ? (redirectResponse.headers['content-length'] / 1024 / 1024).toFixed(1) + ' MB' : 'chunked'}`);
                    resolve({
                        stream: redirectResponse,
                        headers: redirectResponse.headers,
                        status: redirectResponse.statusCode,
                    });
                }).on('error', reject);
                return;
            }

            console.log(`  ☁️  [DRIVE] Response ┃ ${response.statusCode} ┃ ${response.headers['content-length'] ? (response.headers['content-length'] / 1024 / 1024).toFixed(1) + ' MB' : 'chunked'}`);
            resolve({
                stream: response,
                headers: response.headers,
                status: response.statusCode,
            });
        }).on('error', reject);
    });
}

/**
 * Deletes a file from Google Drive.
 */
async function deleteFromDrive(driveFileId) {
    try {
        const drive = getDriveClient();
        await drive.files.delete({ fileId: driveFileId });
    } catch (error) {
        console.error(`⚠️ Failed to delete Google Drive file ${driveFileId}:`, error.message);
    }
}

module.exports = {
    getDriveClient,
    ensureAppFolder,
    ensureUserFolder,
    uploadToDrive,
    getDriveFileMetadata,
    getFileStreamFromDrive,
    deleteFromDrive,
};

