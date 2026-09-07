const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true, 
        index: true 
    },
    name: { 
        type: String, 
        required: true,
        trim: true
    },
    parentId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Folder', 
        default: null, 
        index: true 
    }
}, { timestamps: true });

// Compound Index for fast directory browsing and uniqueness checks per folder
folderSchema.index({ userId: 1, parentId: 1, name: 1 });

const Folder = mongoose.model('Folder', folderSchema);

module.exports = Folder;
