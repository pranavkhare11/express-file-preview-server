const test = require('node:test');
const assert = require('node:assert/strict');
const {
    PORT,
    ACCESS_TOKEN_EXPIRY,
    REFRESH_TOKEN_EXPIRY,
    FILE_LIMITS,
    ALLOWED_MIME_TYPES,
    ALLOWED_EXTENSIONS
} = require('../src/config/constants');

test('constants - configuration boundaries', () => {
    assert.equal(typeof PORT, 'number');
    assert.equal(ACCESS_TOKEN_EXPIRY, '15m');
    assert.equal(REFRESH_TOKEN_EXPIRY, '7d');
    assert.equal(FILE_LIMITS.MAX_VIDEO_SIZE, 10 * 1024 * 1024 * 1024);
    assert.equal(FILE_LIMITS.MAX_AUDIO_SIZE, 100 * 1024 * 1024);
    assert.equal(FILE_LIMITS.MAX_DOC_IMAGE_SIZE, 5 * 1024 * 1024);
    assert.ok(ALLOWED_MIME_TYPES.includes('video/mp4'));
    assert.ok(ALLOWED_EXTENSIONS.includes('.pdf'));
});
