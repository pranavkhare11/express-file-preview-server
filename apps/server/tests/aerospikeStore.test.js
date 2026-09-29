const test = require('node:test');
const assert = require('node:assert/strict');

const { UserStore, FolderStore, FileStore } = require('../src/config/aerospikeStore');

test('Aerospike UserStore - Create, Find, and Delete user', async () => {
    const email = `test_${Date.now()}@example.com`;
    const user = await UserStore.create({
        name: 'Aerospike User',
        email,
        hashedPassword: 'hashed_password_123'
    });

    assert.ok(user._id);
    assert.equal(user.email, email.toLowerCase());
    assert.equal(user.name, 'Aerospike User');

    // Find by email
    const foundByEmail = await UserStore.findOne({ email });
    assert.ok(foundByEmail);
    assert.equal(foundByEmail._id, user._id);

    // Find by ID
    const foundById = await UserStore.findById(user._id);
    assert.ok(foundById);
    assert.equal(foundById.name, 'Aerospike User');

    // Duplicate email rejection
    await assert.rejects(async () => {
        await UserStore.create({
            name: 'Duplicate User',
            email,
            hashedPassword: 'hashed_password_456'
        });
    }, /duplicate key/);

    // Delete user
    const deleted = await UserStore.findByIdAndDelete(user._id);
    assert.ok(deleted);

    const checkAfterDelete = await UserStore.findById(user._id);
    assert.equal(checkAfterDelete, null);
});

test('Aerospike FolderStore - Create, Find, and Tree queries', async () => {
    const userId = 'u_test_user_1';
    const folder = await FolderStore.create({
        userId,
        name: 'Documents',
        parentId: null
    });

    assert.ok(folder._id);
    assert.equal(folder.name, 'Documents');
    assert.equal(folder.parentId, null);

    // Subfolder
    const subfolder = await FolderStore.create({
        userId,
        name: 'Invoices',
        parentId: folder._id
    });

    assert.ok(subfolder._id);
    assert.equal(subfolder.parentId, folder._id);

    // Find subfolders
    const rootSubfolders = await FolderStore.find({ userId, parentId: null });
    assert.ok(rootSubfolders.some(f => f.name === 'Documents'));

    const invoiceSubfolders = await FolderStore.find({ userId, parentId: folder._id });
    assert.equal(invoiceSubfolders.length, 1);
    assert.equal(invoiceSubfolders[0].name, 'Invoices');

    // Rename folder using .save()
    subfolder.name = '2026 Invoices';
    await subfolder.save();

    const updatedSubfolder = await FolderStore.findById(subfolder._id);
    assert.equal(updatedSubfolder.name, '2026 Invoices');
});

test('Aerospike FileStore - Create, Count ref, and Update file', async () => {
    const userId = 'u_test_user_1';
    const storageId = `drv_${Date.now()}`;

    const file = await FileStore.create({
        userId,
        folderId: null,
        filename: 'file1.pdf',
        originalName: 'file1.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        storageFileId: storageId
    });

    assert.ok(file._id);
    assert.equal(file.originalName, 'file1.pdf');
    assert.equal(file.status, 'ready');

    // Reference count test
    const countBefore = await FileStore.countDocuments({ storageFileId: storageId });
    assert.equal(countBefore, 1);

    // Clone pointer
    const clonedFile = await FileStore.create({
        userId,
        folderId: null,
        filename: 'file1_copy.pdf',
        originalName: 'file1 (1).pdf',
        mimeType: 'application/pdf',
        size: 1024,
        storageFileId: storageId
    });

    const countAfter = await FileStore.countDocuments({ storageFileId: storageId });
    assert.equal(countAfter, 2);

    // Delete one pointer
    await FileStore.deleteOne({ _id: file._id });
    const countFinal = await FileStore.countDocuments({ storageFileId: storageId });
    assert.equal(countFinal, 1);
});
