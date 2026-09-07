const test = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET = 'test_secret_key_12345';

const { generateTokens, verifyAccessToken, verifyRefreshToken, decodeToken } = require('../src/services/jwtService');

test('jwtService - generateTokens and verifyAccessToken', () => {
    const mockUser = {
        _id: '60d5ecb8b5c9c22b1c8b4567',
        email: 'testuser@example.com',
        name: 'Test User',
        role: 'user'
    };

    const { accessToken, refreshToken, jti, accessExp, refreshExp } = generateTokens(mockUser);
    assert.ok(accessToken);
    assert.ok(refreshToken);
    assert.ok(jti);
    assert.ok(accessExp);
    assert.ok(refreshExp);

    const decodedAccess = verifyAccessToken(accessToken);
    assert.equal(decodedAccess.userId, mockUser._id);
    assert.equal(decodedAccess.email, mockUser.email);
    assert.equal(decodedAccess.name, mockUser.name);
    assert.equal(decodedAccess.role, 'user');
    assert.equal(decodedAccess.jti, jti);

    const decodedRefresh = verifyRefreshToken(refreshToken);
    assert.equal(decodedRefresh.userId, mockUser._id);
    assert.equal(decodedRefresh.jti, jti);
});

test('jwtService - decodeToken without verification', () => {
    const mockUser = {
        _id: '60d5ecb8b5c9c22b1c8b4567',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin'
    };

    const { accessToken } = generateTokens(mockUser, 'admin');
    const decoded = decodeToken(accessToken);

    assert.equal(decoded.email, 'admin@example.com');
    assert.equal(decoded.role, 'admin');
});
