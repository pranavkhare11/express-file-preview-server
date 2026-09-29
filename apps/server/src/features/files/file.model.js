const { FileStore } = require("../../config/aerospikeStore");

const File = {
    create: (data) => FileStore.create(data),
    insertMany: (files) => FileStore.insertMany(files),
    findById: (id) => FileStore.findById(id),
    findByIdAndUpdate: (id, updates) => FileStore.findByIdAndUpdate(id, updates),
    findOne: (query) => FileStore.findOne(query),
    find: (query) => FileStore.find(query),
    countDocuments: (query) => FileStore.countDocuments(query),
    deleteOne: (query) => FileStore.deleteOne(query),
    deleteMany: (query) => FileStore.deleteMany(query),
    updateMany: (query, updates) => FileStore.updateMany(query, updates)
};

module.exports = File;
