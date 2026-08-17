const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    filename: { type: String, required: true }, // Storage name: `${userId}_${fileUuid}${ext}`
    originalName: { type: String, required: true }, // Unsanitized display name: `My Document (Final).pdf`
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String }, // Optional path for temporary local processing
    driveFileId: { type: String }, // Google Drive API File ID
    storageLocation: {
        type: String,
        enum: ['google_drive', 'local'],
        default: 'google_drive'
    },
    status: {
        type: String,
        enum: ['ready', 'processing', 'failed'],
        default: 'ready'
    },
    progress: {
        type: Number,
        default: 100
    }
}, { timestamps: true });

const File = mongoose.model('File', fileSchema);

module.exports = File;