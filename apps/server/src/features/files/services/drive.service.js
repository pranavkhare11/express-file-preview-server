const { google } = require("googleapis");
const { Readable } = require("stream");
const https = require("https");
const { DRIVE_CONFIG } = require("../../../config/constants");

let cachedFolderId = null;
const userFolderCache = {};

const getOAuth2Client = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Google Drive API credentials (CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN) are missing in .env",
    );
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
};

const getDriveClient = () => {
  const auth = getOAuth2Client();
  return google.drive({ version: "v3", auth });
};

const ensureAppFolder = async () => {
  if (
    process.env.GOOGLE_DRIVE_FOLDER_ID &&
    process.env.GOOGLE_DRIVE_FOLDER_ID.trim() !== ""
  ) {
    return process.env.GOOGLE_DRIVE_FOLDER_ID.trim();
  }

  if (cachedFolderId) {
    return cachedFolderId;
  }

  const drive = getDriveClient();
  const folderName = DRIVE_CONFIG.DEFAULT_FOLDER_NAME;

  const searchRes = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (searchRes.data.files && searchRes.data.files.length > 0) {
    cachedFolderId = searchRes.data.files[0].id;
    return cachedFolderId;
  }

  const createRes = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });

  cachedFolderId = createRes.data.id;
  console.log(
    `📁 Created new Google Drive folder '${folderName}' with ID: ${cachedFolderId}`,
  );
  return cachedFolderId;
};

const ensureUserFolder = async (userId) => {
  if (!userId) return await ensureAppFolder();

  const userIdStr = String(userId);
  if (userFolderCache[userIdStr]) {
    return userFolderCache[userIdStr];
  }

  const drive = getDriveClient();
  const parentFolderId = await ensureAppFolder();

  const searchRes = await drive.files.list({
    q: `name='${userIdStr}' and mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (searchRes.data.files && searchRes.data.files.length > 0) {
    userFolderCache[userIdStr] = searchRes.data.files[0].id;
    return userFolderCache[userIdStr];
  }

  const createRes = await drive.files.create({
    requestBody: {
      name: userIdStr,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    },
    fields: "id",
  });

  userFolderCache[userIdStr] = createRes.data.id;
  console.log(
    `📁 Created Google Drive subfolder for user '${userIdStr}' with ID: ${userFolderCache[userIdStr]}`,
  );
  return userFolderCache[userIdStr];
};

const uploadToDrive = async (
  fileSource,
  driveStorageName,
  mimeType,
  userId = null,
) => {
  const drive = getDriveClient();
  const folderId = userId
    ? await ensureUserFolder(userId)
    : await ensureAppFolder();

  let mediaBody;
  if (Buffer.isBuffer(fileSource)) {
    mediaBody = Readable.from(fileSource);
  } else if (typeof fileSource.pipe === "function") {
    mediaBody = fileSource;
  } else {
    throw new Error(
      "Invalid fileSource provided to uploadToDrive: expected Stream or Buffer",
    );
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
    fields: "id, size",
  });

  return {
    driveFileId: response.data.id,
    storageFileId: response.data.id,
    size: response.data.size ? parseInt(response.data.size, 10) : 0,
  };
};

const getDriveFileMetadata = async (driveFileId) => {
  const drive = getDriveClient();
  const res = await drive.files.get({
    fileId: driveFileId,
    fields: "id, name, mimeType, size",
  });
  return res.data;
};

const fetchDriveStreamWithRetry = async (url, options, maxRetries = 2) => {
  let lastErr = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await new Promise((resolve, reject) => {
        const req = https.get(url, options, (response) => {
          if (response.statusCode === 302 || response.statusCode === 301) {
            const redirectUrl = response.headers.location;
            console.log(
              `  ☁️  [DRIVE ATTEMPT ${attempt}] Redirect ┃ ${redirectUrl.substring(0, 60)}...`,
            );
            const redirectReq = https.get(
              redirectUrl,
              {
                headers: options.headers.Range
                  ? { Range: options.headers.Range }
                  : {},
              },
              (redirectResponse) => {
                resolve({
                  stream: redirectResponse,
                  headers: redirectResponse.headers,
                  status: redirectResponse.statusCode,
                });
              },
            );
            redirectReq.setTimeout(15000, () => {
              redirectReq.destroy(
                new Error(
                  `Drive CDN stream timed out (15s, attempt ${attempt})`,
                ),
              );
            });
            redirectReq.on("error", reject);
            return;
          }

          resolve({
            stream: response,
            headers: response.headers,
            status: response.statusCode,
          });
        });

        req.setTimeout(15000, () => {
          req.destroy(
            new Error(
              `Drive API stream request timed out (15s, attempt ${attempt})`,
            ),
          );
        });
        req.on("error", reject);
      });
    } catch (err) {
      console.warn(
        `  ⚠️ [DRIVE STREAM ATTEMPT ${attempt} FAILED] ${err.message}`,
      );
      lastErr = err;
      if (attempt === maxRetries) throw lastErr;
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
};

const getFileStreamFromDrive = async (driveFileId, rangeHeader) => {
  const auth = getOAuth2Client();
  const tokenResponse = await auth.getAccessToken();
  const accessToken =
    tokenResponse.token || tokenResponse.res?.data?.access_token;

  const url = `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
  };
  if (rangeHeader) {
    headers["Range"] = rangeHeader;
  }

  console.log(
    `  ☁️  [DRIVE] Fetching ┃ ${driveFileId.substring(0, 12)}... ┃ ${rangeHeader || "full file"}`,
  );
  return await fetchDriveStreamWithRetry(url, { headers });
};

const deleteFromDrive = async (driveFileId) => {
  try {
    const drive = getDriveClient();
    await drive.files.delete({ fileId: driveFileId });
  } catch (error) {
    console.error(
      `⚠️ Failed to delete Google Drive file ${driveFileId}:`,
      error.message,
    );
  }
};

module.exports = {
  getDriveClient,
  ensureAppFolder,
  ensureUserFolder,
  uploadToDrive,
  getDriveFileMetadata,
  getFileStreamFromDrive,
  deleteFromDrive,
};
