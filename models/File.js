const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true },
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