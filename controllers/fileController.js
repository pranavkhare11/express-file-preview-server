const File = require('../models/File');
const fs = require('fs');
const { processVideo } = require('../services/videoService');

async function uploadFiles(req, res) {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "No files uploaded" });
        }

        const fileDocs = req.files.map(file => ({
            userId: req.user.userId,
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            path: file.path
        }));

        const savedFiles = await File.insertMany(fileDocs);

        savedFiles.forEach(file => {
            if (file.mimeType.startsWith('video/') ||
                ['.mp4', '.mov', '.mkv', '.webm', '.mpeg', '.avi'].some(ext => file.filename.toLowerCase().endsWith(ext))) {
                processVideo(file);
            }
        });

        res.status(201).json({
            message: `${savedFiles.length} file(s) uploaded successfully`,
            files: savedFiles
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getUserFiles(req, res) {
    try {
        const files = await File.find({ userId: req.user.userId }).sort({ createdAt: -1 });

        const validFiles = [];
        for (const file of files) {
            if (!fs.existsSync(file.path)) {
                await File.deleteOne({ _id: file._id });
            } else {
                validFiles.push(file);
            }
        }

        res.json({ files: validFiles });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch files" });
    }
}

async function previewFile(req, res) {
    try {
        const file = await File.findOne({ _id: req.params.id, userId: req.user.userId });
        if (!file || !fs.existsSync(file.path)) {
            if (file) await File.deleteOne({ _id: file._id });
            return res.status(404).json({ error: "File not found" });
        }

        if (file.status === 'processing') {
            return res.status(202).json({
                message: "Video is currently processing for web optimization. Please try again in a few moments.",
                status: file.status
            });
        }

        const isVideo = file.mimeType.startsWith('video/');
        const range = req.headers.range;

        if (isVideo && range) {
            const stat = fs.statSync(file.path);
            const fileSize = stat.size;

            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunkSize = (end - start) + 1;

            const stream = fs.createReadStream(file.path, { start, end });

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': file.mimeType,
            });

            return stream.pipe(res);
        }

        res.setHeader('Content-Type', file.mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
        res.sendFile(file.path);
    } catch (error) {
        res.status(500).json({ error: "Failed to preview file" });
    }
}

async function downloadFile(req, res) {
    try {
        const file = await File.findOne({ _id: req.params.id, userId: req.user.userId });
        if (!file || !fs.existsSync(file.path)) {
            if (file) await File.deleteOne({ _id: file._id });
            return res.status(404).json({ error: "File not found" });
        }

        res.download(file.path, file.originalName);
    } catch (error) {
        res.status(500).json({ error: "Failed to download file" });
    }
}

async function deleteFile(req, res) {
    try {
        const file = await File.findOne({ _id: req.params.id, userId: req.user.userId });
        if (!file) {
            return res.status(404).json({ error: "File not found" });
        }

        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }

        await File.deleteOne({ _id: file._id });

        res.json({ message: "File deleted successfully" });
    } catch (error) {
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
