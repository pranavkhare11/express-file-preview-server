const { FolderStore } = require("../../config/aerospikeStore");

const Folder = {
    create: (data) => FolderStore.create(data),
    findById: (id) => FolderStore.findById(id),
    findOne: (query) => FolderStore.findOne(query),
    find: (query) => FolderStore.find(query),
    deleteMany: (query) => FolderStore.deleteMany(query),
    deleteOne: (query) => FolderStore.deleteOne(query)
};

module.exports = Folder;
