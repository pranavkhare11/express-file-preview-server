const File = require('../models/File');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { processVideo } = require('../services/videoService');
const { uploadToDrive, getFileStreamFromDrive, deleteFromDrive } = require('../services/driveService');

async function uploadFiles(req, res) {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "No files uploaded" });
        }

        const userId = req.user.userId;
        const savedFiles = [];

        // Ensure temp directory exists for video processing
        const tempDir = path.join(__dirname, '..', 'uploads', 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        for (const file of req.files) {
            const ext = path.extname(file.originalname).toLowerCase();
            const isVideo = file.mimetype.startsWith('video/') ||
                ['.mp4', '.mov', '.mkv', '.webm', '.mpeg', '.avi'].includes(ext);

            // Storage filename on Drive: `${userId}_${fileUuid}${ext}`
            const fileUuid = crypto.randomUUID();
            const storageFilename = `${userId}_${fileUuid}${ext}`;

            if (isVideo) {
                // Save video to temp disk path for FFmpeg transcoding
                const tempFilePath = path.join(tempDir, storageFilename);
                fs.writeFileSync(tempFilePath, file.buffer);

                // Create initial Mongo document with processing status
                const fileDoc = await File.create({
                    userId,
                    filename: storageFilename,
                    originalName: file.originalname,
                    mimeType: file.mimetype,
                    size: file.size,
                    status: 'processing',
                    progress: 0,
                    storageLocation: 'google_drive'
                });

                savedFiles.push(fileDoc);

                // Trigger video processing & Drive upload in background
                processVideo(fileDoc, tempFilePath);
            } else {
                // Stream non-video directly from memory buffer to Google Drive inside user's folder
                const driveUpload = await uploadToDrive(file.buffer, storageFilename, file.mimetype, userId);

                const fileDoc = await File.create({
                    userId,
                    filename: storageFilename,
                    originalName: file.originalname,
                    mimeType: file.mimetype,
                    size: driveUpload.size || file.size,
                    driveFileId: driveUpload.driveFileId,
                    status: 'ready',
                    progress: 100,
                    storageLocation: 'google_drive'
                });

                savedFiles.push(fileDoc);
            }
        }

        res.status(201).json({
            message: `${savedFiles.length} file(s) uploaded successfully`,
            files: savedFiles
        });
    } catch (error) {
        console.error("❌ Upload Error:", error);
        res.status(500).json({ error: error.message || "Failed to upload files" });
    }
}

async function getUserFiles(req, res) {
    try {
        const files = await File.find({ userId: req.user.userId }).sort({ createdAt: -1 });
        res.json({ files });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch files" });
    }
}

async function previewFile(req, res) {
    try {
        const file = await File.findOne({ _id: req.params.id, userId: req.user.userId });
        if (!file) {
            return res.status(404).json({ error: "File not found" });
        }

        if (file.status === 'processing') {
            console.log(`  ⏳ [STREAM] Rejected — still processing: ${file.originalName}`);
            return res.status(202).json({
                message: "Video is currently processing for web optimization. Please try again in a few moments.",
                status: file.status
            });
        }

        if (!file.driveFileId) {
            return res.status(404).json({ error: "File storage ID missing" });
        }

        const isMedia = file.mimeType.startsWith('video/') || file.mimeType.startsWith('audio/');
        const range = req.headers.range;
        const fileSize = file.size;
        const sizeMB = (fileSize / 1024 / 1024).toFixed(1);
        const encodedOriginalName = encodeURIComponent(file.originalName);

        res.setHeader('Content-Type', file.mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${encodedOriginalName}"; filename*=UTF-8''${encodedOriginalName}`);

        if (isMedia) {
            res.setHeader('Accept-Ranges', 'bytes');
        }

        // Range request for media seeking
        if (isMedia && range && fileSize) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunkSize = (end - start) + 1;
            const chunkMB = (chunkSize / 1024 / 1024).toFixed(1);
            const percent = ((start / fileSize) * 100).toFixed(0);

            console.log(`  📡 [STREAM] 206 Partial ┃ ${file.originalName} ┃ ${chunkMB} MB chunk @ ${percent}% (bytes ${start}-${end}/${fileSize})`);

            if (start >= fileSize) {
                console.log(`  ⚠️ [STREAM] 416 Range not satisfiable — start ${start} >= fileSize ${fileSize}`);
                res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
                return res.end();
            }

            const formattedRange = `bytes=${start}-${end}`;
            const driveResult = await getFileStreamFromDrive(file.driveFileId, formattedRange);

            res.status(206);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
            res.setHeader('Content-Length', chunkSize);

            return driveResult.stream.pipe(res);
        }

        // Full file stream (no range or non-media)
        console.log(`  📥 [STREAM] 200 Full ┃ ${file.originalName} ┃ ${sizeMB} MB ┃ ${file.mimeType}`);
        if (fileSize) {
            res.setHeader('Content-Length', fileSize);
        }

        const driveResult = await getFileStreamFromDrive(file.driveFileId);
        driveResult.stream.pipe(res);
    } catch (error) {
        console.error(`  ❌ [STREAM] Failed: ${error.message}`);
        res.status(500).json({ error: "Failed to preview file from Google Drive" });
    }
}

async function downloadFile(req, res) {
    try {
        const file = await File.findOne({ _id: req.params.id, userId: req.user.userId });
        if (!file || !file.driveFileId) {
            return res.status(404).json({ error: "File not found" });
        }

        const driveResult = await getFileStreamFromDrive(file.driveFileId);

        const encodedOriginalName = encodeURIComponent(file.originalName);
        res.setHeader('Content-Type', file.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodedOriginalName}"; filename*=UTF-8''${encodedOriginalName}`);

        driveResult.stream.pipe(res);
    } catch (error) {
        console.error("❌ Download error:", error);
        res.status(500).json({ error: "Failed to download file from Google Drive" });
    }
}

async function deleteFile(req, res) {
    try {
        const file = await File.findOne({ _id: req.params.id, userId: req.user.userId });
        if (!file) {
            return res.status(404).json({ error: "File not found" });
        }

        if (file.driveFileId) {
            await deleteFromDrive(file.driveFileId);
        }

        await File.deleteOne({ _id: file._id });

        res.json({ message: "File deleted successfully" });
    } catch (error) {
        console.error("❌ Delete error:", error);
        res.status(500).json({ error: "Failed to delete file" });
    }
}

module.exports = {
    uploadFiles,
    getUserFiles,
    previewFile,
    downloadFile,
    deleteFile
};
