const path = require('path');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const PASSWORD_MIN_LENGTH = 6;
const SALT_ROUNDS = 12;

const COOKIE_OPTIONS = {
    accessToken: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000 // 15 minutes
    },
    refreshToken: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/refresh',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
};

const REDIS_KEYS = {
    GLOBAL_SESSIONS: 'global_sessions',
    DENYLIST_PREFIX: 'denylist:',
    REFRESH_PREFIX: 'refresh_session:',
    SESSION_META_PREFIX: 'session_meta:',
    ADMIN_EVENTS_CHANNEL: 'admin_events'
};

const FILE_LIMITS = {
    MAX_FILE_COUNT: 5,
    MAX_FILE_SIZE_OVERALL: 10 * 1024 * 1024 * 1024, // 10 GB
    MAX_VIDEO_SIZE: 10 * 1024 * 1024 * 1024,        // 10 GB
    MAX_AUDIO_SIZE: 100 * 1024 * 1024,               // 100 MB
    MAX_DOC_IMAGE_SIZE: 5 * 1024 * 1024             // 5 MB
};

const ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-wav',
    'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-matroska', 'video/webm', 'video/avi',
    'application/pdf', 'text/plain'
];

const ALLOWED_EXTENSIONS = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.mp3', '.wav', '.ogg',
    '.mp4', '.mpeg', '.mov', '.mkv', '.webm', '.avi',
    '.pdf', '.txt'
];

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.mkv', '.webm', '.mpeg', '.avi'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg'];

const DRIVE_CONFIG = {
    DEFAULT_FOLDER_NAME: 'ServerUploads'
};

const PATHS = {
    TEMP_UPLOADS: path.join(__dirname, '..', '..', 'uploads', 'temp')
};

module.exports = {
    PORT,
    HOST,
    ACCESS_TOKEN_EXPIRY,
    REFRESH_TOKEN_EXPIRY,
    COOKIE_OPTIONS,
    PASSWORD_MIN_LENGTH,
    SALT_ROUNDS,
    REDIS_KEYS,
    FILE_LIMITS,
    ALLOWED_MIME_TYPES,
    ALLOWED_EXTENSIONS,
    VIDEO_EXTENSIONS,
    AUDIO_EXTENSIONS,
    DRIVE_CONFIG,
    PATHS
};
