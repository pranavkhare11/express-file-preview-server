const crypto = require('crypto');
const { getAerospikeClient, isAerospikeEnabled, aerospikeNamespace } = require('./aerospike');

// High-performance in-memory cache & fallback store
const usersMap = new Map();
const userEmailsMap = new Map();
const foldersMap = new Map();
const filesMap = new Map();

/**
 * Aerospike Key Helper
 */
const getAerospikeKey = (setName, key) => {
    try {
        const Aerospike = require('aerospike');
        return new Aerospike.Key(aerospikeNamespace, setName, String(key));
    } catch (e) {
        return null;
    }
};

/**
 * Helper to wrap plain objects with Mongoose-like convenience methods (.save())
 */
const wrapDoc = (doc, storeType) => {
    if (!doc) return null;
    const cloned = { ...doc };
    if (!cloned._id && cloned.id) cloned._id = cloned.id;
    if (!cloned.id && cloned._id) cloned.id = cloned._id;

    Object.defineProperty(cloned, 'save', {
        enumerable: false,
        writable: true,
        value: async function () {
            this.updatedAt = new Date().toISOString();
            if (storeType === 'folder') {
                await FolderStore.updateFolder(this._id, this);
            } else if (storeType === 'file') {
                await FileStore.updateFile(this._id, this);
            }
            return this;
        }
    });

    return cloned;
};

/**
 * Aerospike User Store
 */
const UserStore = {
    async create({ name, email, hashedPassword }) {
        const normalizedEmail = email.toLowerCase().trim();
        const existingId = userEmailsMap.get(normalizedEmail);
        if (existingId) {
            const err = new Error('E11000 duplicate key error collection: users index: email_1 dup key');
            err.code = 11000;
            throw err;
        }

        const id = `u_${crypto.randomUUID()}`;
        const now = new Date().toISOString();
        const userDoc = {
            _id: id,
            id,
            name: name.trim(),
            email: normalizedEmail,
            hashedPassword,
            createdAt: now,
            updatedAt: now
        };

        // 1. Aerospike Write
        if (isAerospikeEnabled()) {
            try {
                const client = getAerospikeClient();
                const uKey = getAerospikeKey('users', id);
                const eKey = getAerospikeKey('user_emails', normalizedEmail);
                if (client && uKey && eKey) {
                    await client.put(uKey, userDoc);
                    await client.put(eKey, { userId: id });
                }
            } catch (err) {
                console.warn('  ⚠️ [AEROSPIKE WRITE ERROR users]:', err.message);
            }
        }

        // 2. Memory Map Sync
        usersMap.set(id, userDoc);
        userEmailsMap.set(normalizedEmail, id);

        return wrapDoc(userDoc, 'user');
    },

    async findOne(query) {
        if (!query) return null;
        if (query.email) {
            const normalizedEmail = query.email.toLowerCase().trim();
            let userId = userEmailsMap.get(normalizedEmail);

            if (!userId && isAerospikeEnabled()) {
                try {
                    const client = getAerospikeClient();
                    const eKey = getAerospikeKey('user_emails', normalizedEmail);
                    if (client && eKey) {
                        const rec = await client.get(eKey);
                        if (rec && rec.bins && rec.bins.userId) {
                            userId = rec.bins.userId;
                            userEmailsMap.set(normalizedEmail, userId);
                        }
                    }
                } catch (e) {}
            }

            if (!userId) return null;
            return await this.findById(userId);
        }

        if (query._id || query.id) {
            return await this.findById(query._id || query.id);
        }

        return null;
    },

    async findById(userId) {
        if (!userId) return null;
        const keyStr = String(userId);
        let userDoc = usersMap.get(keyStr);

        if (!userDoc && isAerospikeEnabled()) {
            try {
                const client = getAerospikeClient();
                const uKey = getAerospikeKey('users', keyStr);
                if (client && uKey) {
                    const rec = await client.get(uKey);
                    if (rec && rec.bins) {
                        userDoc = rec.bins;
                        usersMap.set(keyStr, userDoc);
                    }
                }
            } catch (e) {}
        }

        return userDoc ? wrapDoc(userDoc, 'user') : null;
    },

    async findByIdAndDelete(userId) {
        const user = await this.findById(userId);
        if (!user) return null;

        const keyStr = String(userId);
        const normalizedEmail = user.email ? user.email.toLowerCase() : null;

        // Aerospike Delete
        if (isAerospikeEnabled()) {
            try {
                const client = getAerospikeClient();
                const uKey = getAerospikeKey('users', keyStr);
                if (client && uKey) await client.remove(uKey);
                if (normalizedEmail) {
                    const eKey = getAerospikeKey('user_emails', normalizedEmail);
                    if (client && eKey) await client.remove(eKey);
                }
            } catch (e) {}
        }

        usersMap.delete(keyStr);
        if (normalizedEmail) userEmailsMap.delete(normalizedEmail);

        return user;
    }
};

/**
 * Aerospike Folder Store
 */
const FolderStore = {
    async create({ userId, name, parentId = null }) {
        const id = `fld_${crypto.randomUUID()}`;
        const now = new Date().toISOString();
        const folderDoc = {
            _id: id,
            id,
            userId: String(userId),
            name: String(name).trim(),
            parentId: parentId ? String(parentId) : null,
            createdAt: now,
            updatedAt: now
        };

        if (isAerospikeEnabled()) {
            try {
                const client = getAerospikeClient();
                const key = getAerospikeKey('folders', id);
                if (client && key) await client.put(key, folderDoc);
            } catch (err) {
                console.warn('  ⚠️ [AEROSPIKE WRITE ERROR folders]:', err.message);
            }
        }

        foldersMap.set(id, folderDoc);
        return wrapDoc(folderDoc, 'folder');
    },

    async updateFolder(folderId, fields) {
        const keyStr = String(folderId);
        const existing = foldersMap.get(keyStr) || {};
        const updated = {
            ...existing,
            ...fields,
            _id: keyStr,
            id: keyStr,
            updatedAt: new Date().toISOString()
        };

        if (isAerospikeEnabled()) {
            try {
                const client = getAerospikeClient();
                const key = getAerospikeKey('folders', keyStr);
                if (client && key) await client.put(key, updated);
            } catch (e) {}
        }

        foldersMap.set(keyStr, updated);
        return wrapDoc(updated, 'folder');
    },

    async findById(folderId) {
        if (!folderId) return null;
        const keyStr = String(folderId);
        let doc = foldersMap.get(keyStr);

        if (!doc && isAerospikeEnabled()) {
            try {
                const client = getAerospikeClient();
                const key = getAerospikeKey('folders', keyStr);
                if (client && key) {
                    const rec = await client.get(key);
                    if (rec && rec.bins) {
                        doc = rec.bins;
                        foldersMap.set(keyStr, doc);
                    }
                }
            } catch (e) {}
        }

        return doc ? wrapDoc(doc, 'folder') : null;
    },

    async findOne(query = {}) {
        const results = await this.find(query);
        return results.length > 0 ? results[0] : null;
    },

    async find(query = {}) {
        let list = Array.from(foldersMap.values());

        if (query.userId !== undefined) {
            const uid = String(query.userId);
            list = list.filter(f => String(f.userId) === uid);
        }

        if (query.parentId !== undefined) {
            if (query.parentId === null) {
                list = list.filter(f => f.parentId === null || f.parentId === undefined);
            } else if (typeof query.parentId === 'object' && query.parentId.$in) {
                const inList = query.parentId.$in.map(String);
                list = list.filter(f => f.parentId && inList.includes(String(f.parentId)));
            } else {
                const pid = String(query.parentId);
                list = list.filter(f => String(f.parentId) === pid);
            }
        }

        if (query._id !== undefined) {
            if (typeof query._id === 'object' && query._id.$in) {
                const inList = query._id.$in.map(String);
                list = list.filter(f => inList.includes(String(f._id || f.id)));
            } else {
                const qid = String(query._id);
                list = list.filter(f => String(f._id || f.id) === qid);
            }
        }

        if (query.name !== undefined) {
            if (query.name instanceof RegExp) {
                list = list.filter(f => query.name.test(f.name));
            } else {
                list = list.filter(f => f.name === String(query.name));
            }
        }

        const results = list.map(f => wrapDoc(f, 'folder'));

        // Query chain simulation (.sort, .select)
        results.sort = function (sortObj) {
            if (sortObj && sortObj.name) {
                const order = sortObj.name;
                results.sort((a, b) => order === 1 ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
            }
            return results;
        };

        results.select = function () {
            return results;
        };

        return results;
    },

    async deleteMany(query = {}) {
        const matches = await this.find(query);
        let count = 0;
        for (const item of matches) {
            const id = String(item._id || item.id);
            if (isAerospikeEnabled()) {
                try {
                    const client = getAerospikeClient();
                    const key = getAerospikeKey('folders', id);
                    if (client && key) await client.remove(key);
                } catch (e) {}
            }
            foldersMap.delete(id);
            count++;
        }
        return { deletedCount: count };
    },

    async deleteOne(query = {}) {
        const item = await this.findOne(query);
        if (item) {
            const id = String(item._id || item.id);
            if (isAerospikeEnabled()) {
                try {
                    const client = getAerospikeClient();
                    const key = getAerospikeKey('folders', id);
                    if (client && key) await client.remove(key);
                } catch (e) {}
            }
            foldersMap.delete(id);
            return { deletedCount: 1 };
        }
        return { deletedCount: 0 };
    }
};

/**
 * Aerospike File Store
 */
const FileStore = {
    async create(data) {
        const id = `file_${crypto.randomUUID()}`;
        const now = new Date().toISOString();
        const fileDoc = {
            _id: id,
            id,
            userId: String(data.userId),
            folderId: data.folderId ? String(data.folderId) : null,
            filename: String(data.filename),
            originalName: String(data.originalName),
            mimeType: String(data.mimeType),
            size: Number(data.size || 0),
            path: data.path,
            storageFileId: String(data.storageFileId || data.driveFileId || id),
            driveFileId: String(data.driveFileId || data.storageFileId || id),
            storageLocation: data.storageLocation || 'google_drive',
            status: data.status || 'ready',
            progress: data.progress !== undefined ? Number(data.progress) : 100,
            createdAt: now,
            updatedAt: now
        };

        if (isAerospikeEnabled()) {
            try {
                const client = getAerospikeClient();
                const key = getAerospikeKey('files', id);
                if (client && key) await client.put(key, fileDoc);
            } catch (err) {
                console.warn('  ⚠️ [AEROSPIKE WRITE ERROR files]:', err.message);
            }
        }

        filesMap.set(id, fileDoc);
        return wrapDoc(fileDoc, 'file');
    },

    async insertMany(filesArray = []) {
        const created = [];
        for (const f of filesArray) {
            const doc = await this.create(f);
            created.push(doc);
        }
        return created;
    },

    async updateFile(fileId, fields) {
        const keyStr = String(fileId);
        const existing = filesMap.get(keyStr) || {};
        const updated = {
            ...existing,
            ...fields,
            _id: keyStr,
            id: keyStr,
            updatedAt: new Date().toISOString()
        };

        if (isAerospikeEnabled()) {
            try {
                const client = getAerospikeClient();
                const key = getAerospikeKey('files', keyStr);
                if (client && key) await client.put(key, updated);
            } catch (e) {}
        }

        filesMap.set(keyStr, updated);
        return wrapDoc(updated, 'file');
    },

    async findById(fileId) {
        if (!fileId) return null;
        const keyStr = String(fileId);
        let doc = filesMap.get(keyStr);

        if (!doc && isAerospikeEnabled()) {
            try {
                const client = getAerospikeClient();
                const key = getAerospikeKey('files', keyStr);
                if (client && key) {
                    const rec = await client.get(key);
                    if (rec && rec.bins) {
                        doc = rec.bins;
                        filesMap.set(keyStr, doc);
                    }
                }
            } catch (e) {}
        }

        return doc ? wrapDoc(doc, 'file') : null;
    },

    async findByIdAndUpdate(fileId, updates = {}) {
        return await this.updateFile(fileId, updates);
    },

    async findOne(query = {}) {
        const results = await this.find(query);
        return results.length > 0 ? results[0] : null;
    },

    async find(query = {}) {
        let list = Array.from(filesMap.values());

        if (query.userId !== undefined) {
            const uid = String(query.userId);
            list = list.filter(f => String(f.userId) === uid);
        }

        if (query.folderId !== undefined) {
            if (query.folderId === null) {
                list = list.filter(f => f.folderId === null || f.folderId === undefined);
            } else if (typeof query.folderId === 'object' && query.folderId.$in) {
                const inList = query.folderId.$in.map(String);
                list = list.filter(f => f.folderId && inList.includes(String(f.folderId)));
            } else {
                const fid = String(query.folderId);
                list = list.filter(f => String(f.folderId) === fid);
            }
        }

        if (query._id !== undefined) {
            if (typeof query._id === 'object' && query._id.$in) {
                const inList = query._id.$in.map(String);
                list = list.filter(f => inList.includes(String(f._id || f.id)));
            } else {
                const qid = String(query._id);
                list = list.filter(f => String(f._id || f.id) === qid);
            }
        }

        if (query.originalName !== undefined) {
            if (query.originalName instanceof RegExp) {
                list = list.filter(f => query.originalName.test(f.originalName));
            } else {
                list = list.filter(f => f.originalName === String(query.originalName));
            }
        }

        if (query.storageFileId !== undefined) {
            if (query.storageFileId instanceof RegExp) {
                list = list.filter(f => query.storageFileId.test(f.storageFileId));
            } else {
                list = list.filter(f => f.storageFileId === String(query.storageFileId));
            }
        }

        if (query.status !== undefined) {
            list = list.filter(f => f.status === query.status);
        }

        const results = list.map(f => wrapDoc(f, 'file'));

        results.sort = function (sortObj) {
            if (sortObj && sortObj.createdAt) {
                const order = sortObj.createdAt;
                results.sort((a, b) => order === 1
                    ? new Date(a.createdAt) - new Date(b.createdAt)
                    : new Date(b.createdAt) - new Date(a.createdAt)
                );
            }
            return results;
        };

        results.select = function () {
            return results;
        };

        return results;
    },

    async countDocuments(query = {}) {
        const matches = await this.find(query);
        return matches.length;
    },

    async deleteOne(query = {}) {
        const item = await this.findOne(query);
        if (item) {
            const id = String(item._id || item.id);
            if (isAerospikeEnabled()) {
                try {
                    const client = getAerospikeClient();
                    const key = getAerospikeKey('files', id);
                    if (client && key) await client.remove(key);
                } catch (e) {}
            }
            filesMap.delete(id);
            return { deletedCount: 1 };
        }
        return { deletedCount: 0 };
    },

    async deleteMany(query = {}) {
        const matches = await this.find(query);
        let count = 0;
        for (const item of matches) {
            const id = String(item._id || item.id);
            if (isAerospikeEnabled()) {
                try {
                    const client = getAerospikeClient();
                    const key = getAerospikeKey('files', id);
                    if (client && key) await client.remove(key);
                } catch (e) {}
            }
            filesMap.delete(id);
            count++;
        }
        return { deletedCount: count };
    },

    async updateMany(query = {}, updateFields = {}) {
        const matches = await this.find(query);
        for (const item of matches) {
            await this.updateFile(item._id || item.id, updateFields);
        }
        return { modifiedCount: matches.length };
    }
};

module.exports = {
    UserStore,
    FolderStore,
    FileStore
};
