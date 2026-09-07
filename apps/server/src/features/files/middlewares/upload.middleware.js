const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const {
    ALLOWED_MIME_TYPES,
    ALLOWED_EXTENSIONS,
    FILE_LIMITS,
    PATHS
} = require('../../../config/constants');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(PATHS.TEMP_UPLOADS)) {
            fs.mkdirSync(PATHS.TEMP_UPLOADS, { recursive: true });
        }
        cb(null, PATHS.TEMP_UPLOADS);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}_${crypto.randomUUID()}`;
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `raw_${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isMimeValid = ALLOWED_MIME_TYPES.includes(file.mimetype);
    const isExtValid = ALLOWED_EXTENSIONS.includes(ext);

    if (!isMimeValid && !isExtValid) {
        return cb(new Error(`Invalid file type for '${file.originalname}'. Allowed: Images, Audio, Video, PDF, TXT`), false);
    }

    cb(null, true);
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: FILE_LIMITS.MAX_FILE_SIZE_OVERALL
    }
});

const handleUpload = (req, res, next) => {
    const uploadArray = upload.array('files', FILE_LIMITS.MAX_FILE_COUNT);
    uploadArray(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
};

module.exports = {
    handleUpload
};
