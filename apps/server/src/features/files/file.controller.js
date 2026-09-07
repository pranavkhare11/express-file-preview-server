const fileService = require('./file.service');
const { enqueueUserTask } = require('../../services/userQueue.service');

const getExplorerContents = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const rawFolderId = req.query.folderId;
        const folderId = (rawFolderId && rawFolderId !== 'null' && rawFolderId !== 'undefined') ? rawFolderId : null;
        const data = await fileService.getDirectoryContents(userId, folderId);
        res.json(data);
    } catch (error) {
        next(error);
    }
};

const createFolder = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { name, parentId } = req.body;

        const result = await enqueueUserTask(userId, async () => {
            return await fileService.createFolder(userId, name, parentId);
        });

        res.status(201).json({ message: "Folder created successfully", folder: result });
    } catch (error) {
        next(error);
    }
};

const renameItem = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { itemId, itemType, newName } = req.body;

        const result = await enqueueUserTask(userId, async () => {
            return await fileService.renameItem(userId, itemId, itemType, newName);
        });

        res.json({ message: "Item renamed successfully", item: result });
    } catch (error) {
        next(error);
    }
};

const moveItem = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { itemId, itemType, targetFolderId } = req.body;

        const result = await enqueueUserTask(userId, async () => {
            return await fileService.moveItem(userId, itemId, itemType, targetFolderId);
        });

        res.json({ message: "Item moved successfully", item: result });
    } catch (error) {
        next(error);
    }
};

const copyItem = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { itemId, itemType, targetFolderId } = req.body;

        const result = await enqueueUserTask(userId, async () => {
            return await fileService.copyItem(userId, itemId, itemType, targetFolderId);
        });

        res.status(201).json({ message: "Item copied successfully", item: result });
    } catch (error) {
        next(error);
    }
};

const deleteItem = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { itemId, itemType } = req.body;

        const result = await enqueueUserTask(userId, async () => {
            return await fileService.deleteItem(userId, itemId, itemType);
        });

        res.json(result);
    } catch (error) {
        next(error);
    }
};

const uploadFiles = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const targetFolderId = req.body.folderId || null;

        const savedFiles = await enqueueUserTask(userId, async () => {
            return await fileService.uploadFiles(req.files, userId, targetFolderId);
        });

        res.status(201).json({
            message: `${savedFiles.length} file(s) uploaded successfully`,
            files: savedFiles
        });
    } catch (error) {
        next(error);
    }
};

const previewFile = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const fileId = req.params.id;
        const range = req.headers.range;

        const File = require('./file.model');
        const file = await File.findOne({ _id: fileId, userId });
        if (!file) {
            return res.status(404).json({ error: "File not found" });
        }

        if (file.status === 'processing') {
            return res.status(202).json({
                message: "Video is currently processing. Please try again in a few moments.",
                status: file.status
            });
        }

        const isMedia = file.mimeType.startsWith('video/') || file.mimeType.startsWith('audio/');
        const fileSize = file.size;
        const encodedName = encodeURIComponent(file.originalName);

        res.setHeader('Content-Type', file.mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${encodedName}"; filename*=UTF-8''${encodedName}`);

        if (isMedia) {
            res.setHeader('Accept-Ranges', 'bytes');
        }

        if (isMedia && range && fileSize) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunkSize = (end - start) + 1;

            if (start >= fileSize) {
                res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
                return res.end();
            }

            const driveResult = await fileService.getFileStreamFromDrive(file.storageFileId, `bytes=${start}-${end}`);
            res.status(206);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
            res.setHeader('Content-Length', chunkSize);
            return driveResult.stream.pipe(res);
        }

        if (fileSize) {
            res.setHeader('Content-Length', fileSize);
        }

        const driveResult = await fileService.getFileStreamFromDrive(file.storageFileId);
        driveResult.stream.pipe(res);
    } catch (error) {
        next(error);
    }
};

const downloadFile = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const fileId = req.params.id;

        const File = require('./file.model');
        const file = await File.findOne({ _id: fileId, userId });
        if (!file || !file.storageFileId) {
            return res.status(404).json({ error: "File not found" });
        }

        const driveResult = await fileService.getFileStreamFromDrive(file.storageFileId);
        const encodedName = encodeURIComponent(file.originalName);

        res.setHeader('Content-Type', file.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`);
        driveResult.stream.pipe(res);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getExplorerContents,
    createFolder,
    renameItem,
    moveItem,
    copyItem,
    deleteItem,
    uploadFiles,
    previewFile,
    downloadFile
};
