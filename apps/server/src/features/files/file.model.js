const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true
    },
    folderId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Folder', 
        default: null
    },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String },
    storageFileId: { type: String, required: true },
    driveFileId: { type: String }, // Legacy field for backwards compatibility
    storageLocation: {
        type: String,
        enum: ['google_drive', 's3', 'local'],
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

// Auto-migrate legacy driveFileId to storageFileId before validation
fileSchema.pre('validate', function () {
    if (!this.storageFileId && this.driveFileId) {
        this.storageFileId = this.driveFileId;
    }
});

// Indexes for fast VFS browsing and microsecond reference counting
fileSchema.index({ userId: 1, folderId: 1, originalName: 1 });
fileSchema.index({ storageFileId: 1 });

const File = mongoose.model('File', fileSchema);

module.exports = File;
