const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const userId = req.user.userId;
        const userDir = path.join(__dirname, '..', 'uploads', String(userId));

        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }

        cb(null, userDir);
    },
    filename: (req, file, cb) => {
        const rawName = req.user?.name || req.user?.email || 'user';
        const sanitizedUsername = rawName.replace(/[^a-zA-Z0-9_-]/g, '_');
        const uuid = crypto.randomUUID();
        const ext = path.extname(file.originalname);
        const filename = `${sanitizedUsername}-${uuid}${ext}`;
        cb(null, filename);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-wav',
        'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-matroska', 'video/webm', 'video/avi',
        'application/pdf', 'text/plain'
    ];

    const allowedExtensions = [
        '.jpg', '.jpeg', '.png', '.gif', '.webp',
        '.mp3', '.wav', '.ogg',
        '.mp4', '.mpeg', '.mov', '.mkv', '.webm', '.avi',
        '.pdf', '.txt'
    ];

    const ext = path.extname(file.originalname).toLowerCase();
    const isMimeValid = allowedMimeTypes.includes(file.mimetype);
    const isExtValid = allowedExtensions.includes(ext);

    if (!isMimeValid && !isExtValid) {
        return cb(new Error(`Invalid file type for '${file.originalname}'. Allowed: Images, Audio, Video, PDF, TXT`), false);
    }

    cb(null, true);
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 * 1024
    }
});

function handleUpload(req, res, next) {
    const uploadArray = upload.array('files', 5);
    uploadArray(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}

function validateFileSizes(req, res, next) {
    if (!req.files || req.files.length === 0) return next();

    for (const file of req.files) {
        const ext = path.extname(file.originalname).toLowerCase();
        const isVideo = file.mimetype.startsWith('video/') || ['.mp4', '.mov', '.mkv', '.webm', '.mpeg', '.avi'].includes(ext);
        const isMusic = file.mimetype.startsWith('audio/') || ['.mp3', '.wav', '.ogg'].includes(ext);

        const maxDocOrImageSize = 5 * 1024 * 1024;
        const maxMusicSize = 100 * 1024 * 1024;
        const maxVideoSize = 10 * 1024 * 1024 * 1024;

        let limitExceeded = false;
        let errorMsg = '';

        if (isVideo && file.size > maxVideoSize) {
            limitExceeded = true;
            errorMsg = `Video file '${file.originalname}' exceeds 10 GB limit.`;
        } else if (isMusic && file.size > maxMusicSize) {
            limitExceeded = true;
            errorMsg = `Audio file '${file.originalname}' exceeds 100 MB limit.`;
        } else if (!isVideo && !isMusic && file.size > maxDocOrImageSize) {
            limitExceeded = true;
            errorMsg = `File '${file.originalname}' exceeds 5 MB limit.`;
        }

        if (limitExceeded) {
            req.files.forEach(f => {
                if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
            });
            return res.status(400).json({ error: errorMsg });
        }
    }

    next();
}

module.exports = {
    handleUpload,
    validateFileSizes
};
