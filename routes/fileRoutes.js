const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const { handleUpload, validateFileSizes } = require('../middlewares/uploadMiddleware');
const {
    uploadFiles,
    getUserFiles,
    previewFile,
    downloadFile,
    deleteFile
} = require('../controllers/fileController');

router.post('/upload', authenticateToken, handleUpload, validateFileSizes, uploadFiles);
router.get('/', authenticateToken, getUserFiles);
router.get('/:id/preview', authenticateToken, previewFile);
router.get('/:id/download', authenticateToken, downloadFile);
router.delete('/:id', authenticateToken, deleteFile);

module.exports = router;
