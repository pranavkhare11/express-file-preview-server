const path = require('path');
const {
    FILE_LIMITS,
    VIDEO_EXTENSIONS,
    AUDIO_EXTENSIONS
} = require('../../../config/constants');

const validateFileSizes = (req, res, next) => {
    if (!req.files || req.files.length === 0) return next();

    for (const file of req.files) {
        const ext = path.extname(file.originalname).toLowerCase();
        const isVideo = file.mimetype.startsWith('video/') || VIDEO_EXTENSIONS.includes(ext);
        const isMusic = file.mimetype.startsWith('audio/') || AUDIO_EXTENSIONS.includes(ext);

        let limitExceeded = false;
        let errorMsg = '';

        if (isVideo && file.size > FILE_LIMITS.MAX_VIDEO_SIZE) {
            limitExceeded = true;
            errorMsg = `Video file '${file.originalname}' exceeds 10 GB limit.`;
        } else if (isMusic && file.size > FILE_LIMITS.MAX_AUDIO_SIZE) {
            limitExceeded = true;
            errorMsg = `Audio file '${file.originalname}' exceeds 100 MB limit.`;
        } else if (!isVideo && !isMusic && file.size > FILE_LIMITS.MAX_DOC_IMAGE_SIZE) {
            limitExceeded = true;
            errorMsg = `File '${file.originalname}' exceeds 5 MB limit.`;
        }

        if (limitExceeded) {
            return res.status(400).json({ error: errorMsg });
        }
    }

    next();
};

module.exports = {
    validateFileSizes
};
