const path = require("path");
const fs = require("fs");
const File = require("./file.model");
const Folder = require("./folder.model");
const {
  uploadToDrive,
  deleteFromDrive,
  getFileStreamFromDrive,
} = require("./services/drive.service");
const { processVideo } = require("./services/video.service");
const { broadcastSystemState } = require("../../services/sessionService");

/**
 * Auto-generates a unique display name if duplicate names exist in the same folder.
 * e.g. "report.pdf" -> "report (1).pdf" -> "report (2).pdf"
 */
const generateUniqueName = async (
  userId,
  folderId,
  originalName,
  isFolder = false,
) => {
  let baseName = originalName;
  let ext = "";

  if (!isFolder) {
    ext = path.extname(originalName);
    baseName = path.basename(originalName, ext);
  }

  // Escape regex special characters in baseName and ext
  const escapedBase = baseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedExt = ext.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const regex = new RegExp(`^${escapedBase}( \\(\\d+\\))?${escapedExt}$`, "i");

  let existingNames = [];
  if (isFolder) {
    const matches = await Folder.find({
      userId,
      parentId: folderId,
      name: regex,
    }).select("name");
    existingNames = matches.map((m) => m.name);
  } else {
    const matches = await File.find({
      userId,
      folderId,
      originalName: regex,
    }).select("originalName");
    existingNames = matches.map((m) => m.originalName);
  }

  if (existingNames.length === 0) {
    return originalName;
  }

  let maxIndex = 0;
  const numberRegex = new RegExp(
    `^${escapedBase} \\((\\d+)\\)${escapedExt}$`,
    "i",
  );

  existingNames.forEach((name) => {
    if (name.toLowerCase() === originalName.toLowerCase()) {
      maxIndex = Math.max(maxIndex, 0);
    } else {
      const match = name.match(numberRegex);
      if (match) {
        maxIndex = Math.max(maxIndex, parseInt(match[1], 10));
      }
    }
  });

  return `${baseName} (${maxIndex + 1})${ext}`;
};

/**
 * Builds breadcrumb trail from root to the specified folder.
 */
const buildBreadcrumbs = async (userId, folderId) => {
  const breadcrumbs = [{ _id: null, name: "Home" }];
  if (!folderId) return breadcrumbs;

  const trail = [];
  let currentId = folderId;

  while (currentId) {
    const folder = await Folder.findOne({ _id: currentId, userId }).select(
      "_id name parentId",
    );
    if (!folder) break;
    trail.unshift({ _id: folder._id, name: folder.name });
    currentId = folder.parentId;
  }

  return breadcrumbs.concat(trail);
};

/**
 * Returns VFS contents (subfolders + files + breadcrumbs) for a given folderId.
 */
const getDirectoryContents = async (userId, folderId = null) => {
  if (folderId === 'null' || folderId === 'undefined') {
    folderId = null;
  }

  let currentFolder = null;
  if (folderId) {
    currentFolder = await Folder.findOne({ _id: folderId, userId });
    if (!currentFolder) {
      throw new Error("Target folder not found");
    }
  }

  const [breadcrumbs, subfolders, files] = await Promise.all([
    buildBreadcrumbs(userId, folderId),
    Folder.find({ userId, parentId: folderId }).sort({ name: 1 }),
    File.find({ userId, folderId }).sort({ createdAt: -1 }),
  ]);

  const formattedBreadcrumbs = breadcrumbs.map((b) => ({
    id: String(b._id),
    name: b.name,
  }));

  const formattedFolders = subfolders.map((f) => ({
    id: String(f._id),
    name: f.name,
    type: 'folder',
    parentId: f.parentId ? String(f.parentId) : null,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  }));

  const formattedFiles = files.map((f) => ({
    id: String(f._id),
    name: f.originalName,
    type: 'file',
    size: f.size,
    mimeType: f.mimeType,
    status: f.status,
    progress: f.progress,
    storageFileId: f.storageFileId,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  }));

  return {
    currentFolder: currentFolder ? { id: String(currentFolder._id), name: currentFolder.name } : null,
    breadcrumbs: formattedBreadcrumbs,
    folders: formattedFolders,
    files: formattedFiles,
  };
};

/**
 * Creates a new virtual folder.
 */
const createFolder = async (userId, name, parentId = null) => {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Folder name cannot be empty");

  const uniqueName = await generateUniqueName(
    userId,
    parentId,
    trimmedName,
    true,
  );

  const folder = await Folder.create({
    userId,
    name: uniqueName,
    parentId: parentId || null,
  });

  return folder;
};

/**
 * Renames a file or folder.
 */
const renameItem = async (userId, itemId, itemType, newName) => {
  const trimmedName = newName.trim();
  if (!trimmedName) throw new Error("Name cannot be empty");

  if (itemType === "folder") {
    const folder = await Folder.findOne({ _id: itemId, userId });
    if (!folder) throw new Error("Folder not found");

    const uniqueName = await generateUniqueName(
      userId,
      folder.parentId,
      trimmedName,
      true,
    );
    folder.name = uniqueName;
    await folder.save();
    return folder;
  } else {
    const file = await File.findOne({ _id: itemId, userId });
    if (!file) throw new Error("File not found");

    const uniqueName = await generateUniqueName(
      userId,
      file.folderId,
      trimmedName,
      false,
    );
    file.originalName = uniqueName;
    await file.save();
    return file;
  }
};

/**
 * Moves a file or folder to a target folder.
 */
const moveItem = async (userId, itemId, itemType, targetFolderId = null) => {
  const targetParentId = targetFolderId || null;

  if (itemType === "folder") {
    if (String(itemId) === String(targetParentId)) {
      throw new Error("Cannot move a folder into itself");
    }

    // Recursion Bomb check: target folder cannot be a descendant of source folder
    let checkId = targetParentId;
    while (checkId) {
      if (String(checkId) === String(itemId)) {
        throw new Error("Cannot move a folder into one of its own subfolders");
      }
      const parent = await Folder.findOne({ _id: checkId, userId }).select(
        "parentId",
      );
      checkId = parent ? parent.parentId : null;
    }

    const folder = await Folder.findOne({ _id: itemId, userId });
    if (!folder) throw new Error("Folder not found");

    folder.parentId = targetParentId;
    await folder.save();
    return folder;
  } else {
    const file = await File.findOne({ _id: itemId, userId });
    if (!file) throw new Error("File not found");

    file.folderId = targetParentId;
    await file.save();
    return file;
  }
};

/**
 * Virtual Pointer Copy: Instantly clones a file or folder tree without duplicating storage bytes.
 */
const copyItem = async (userId, itemId, itemType, targetFolderId = null) => {
  const targetParentId = targetFolderId || null;

  if (itemType === "file") {
    const sourceFile = await File.findOne({ _id: itemId, userId });
    if (!sourceFile) throw new Error("Source file not found");

    const uniqueName = await generateUniqueName(
      userId,
      targetParentId,
      sourceFile.originalName,
      false,
    );

    const clonedFile = await File.create({
      userId,
      folderId: targetParentId,
      filename: sourceFile.filename,
      originalName: uniqueName,
      mimeType: sourceFile.mimeType,
      size: sourceFile.size,
      storageFileId: sourceFile.storageFileId,
      storageLocation: sourceFile.storageLocation,
      status: sourceFile.status,
      progress: sourceFile.progress,
    });

    return clonedFile;
  }

  if (itemType === "folder") {
    const sourceFolder = await Folder.findOne({ _id: itemId, userId });
    if (!sourceFolder) throw new Error("Source folder not found");

    // Recursion Bomb check
    let checkId = targetParentId;
    while (checkId) {
      if (String(checkId) === String(itemId)) {
        throw new Error("Cannot copy a folder into one of its own subfolders");
      }
      const parent = await Folder.findOne({ _id: checkId, userId }).select(
        "parentId",
      );
      checkId = parent ? parent.parentId : null;
    }

    // Map old folder ObjectIds to new cloned folder ObjectIds
    const idMap = new Map();

    // Collect all descendant folders recursively
    const allSourceFolders = [sourceFolder];
    const queue = [sourceFolder];

    while (queue.length > 0) {
      const current = queue.shift();
      const children = await Folder.find({ userId, parentId: current._id });
      for (const child of children) {
        allSourceFolders.push(child);
        queue.push(child);
      }
    }

    // 1. Clone folders top-down
    const rootUniqueName = await generateUniqueName(
      userId,
      targetParentId,
      sourceFolder.name,
      true,
    );

    for (const f of allSourceFolders) {
      const parentNewId =
        String(f._id) === String(itemId)
          ? targetParentId
          : idMap.get(String(f.parentId));

      const folderName =
        String(f._id) === String(itemId) ? rootUniqueName : f.name;

      const cloned = await Folder.create({
        userId,
        name: folderName,
        parentId: parentNewId,
      });

      idMap.set(String(f._id), cloned._id);
    }

    // 2. Bulk clone child files using Virtual Pointer Copy
    const oldFolderIds = allSourceFolders.map((f) => f._id);
    const childFiles = await File.find({
      userId,
      folderId: { $in: oldFolderIds },
    });

    if (childFiles.length > 0) {
      const newFiles = childFiles.map((file) => ({
        userId,
        folderId: idMap.get(String(file.folderId)),
        filename: file.filename,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        storageFileId: file.storageFileId,
        storageLocation: file.storageLocation,
        status: file.status,
        progress: file.progress,
      }));

      await File.insertMany(newFiles);
    }

    return await Folder.findById(idMap.get(String(itemId)));
  }
};

/**
 * Safe Deletion with Atomic Reference Counting.
 */
const deleteItem = async (userId, itemId, itemType) => {
  if (itemType === "file") {
    const file = await File.findOne({ _id: itemId, userId });
    if (!file) throw new Error("File not found");

    const refCount = await File.countDocuments({
      storageFileId: file.storageFileId,
    });
    await File.deleteOne({ _id: file._id });

    if (refCount === 1) {
      console.log(
        `  🗑️  [DRIVE DELETE] Last pointer removed. Deleting physical file: ${file.storageFileId}`,
      );
      await deleteFromDrive(file.storageFileId);
    } else {
      console.log(
        `  ℹ️  [DRIVE KEEP] Retaining physical storage file. Remaining pointers: ${refCount - 1}`,
      );
    }
    return { message: "File deleted successfully" };
  }

  if (itemType === "folder") {
    const rootFolder = await Folder.findOne({ _id: itemId, userId });
    if (!rootFolder) throw new Error("Folder not found");

    // Collect all subfolder IDs recursively
    const allFolderIds = [rootFolder._id];
    const queue = [rootFolder._id];

    while (queue.length > 0) {
      const currentId = queue.shift();
      const children = await Folder.find({
        userId,
        parentId: currentId,
      }).select("_id");
      for (const child of children) {
        allFolderIds.push(child._id);
        queue.push(child._id);
      }
    }

    // Find all files belonging to any of these folders
    const filesToDelete = await File.find({
      userId,
      folderId: { $in: allFolderIds },
    });

    // Safe Reference Counting Deletion per file
    for (const file of filesToDelete) {
      const refCount = await File.countDocuments({
        storageFileId: file.storageFileId,
      });
      await File.deleteOne({ _id: file._id });

      if (refCount === 1) {
        console.log(
          `  🗑️  [DRIVE DELETE] Last pointer removed for file ${file.originalName}: ${file.storageFileId}`,
        );
        await deleteFromDrive(file.storageFileId);
      }
    }

    // Delete all folder documents
    await Folder.deleteMany({ _id: { $in: allFolderIds }, userId });

    return { message: "Folder and all contents deleted successfully" };
  }
};

/**
 * Handles multi-file uploads into target folderId.
 */
const uploadFiles = async (reqFiles, userId, targetFolderId = null) => {
  if (!reqFiles || reqFiles.length === 0) {
    throw new Error("No files uploaded");
  }

  const savedFiles = [];
  const tempDir = path.join(__dirname, "..", "..", "..", "uploads", "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  for (const file of reqFiles) {
    const ext = path.extname(file.originalname).toLowerCase();
    const isVideo =
      file.mimetype.startsWith("video/") ||
      [".mp4", ".mov", ".mkv", ".webm", ".mpeg", ".avi"].includes(ext);

    const fileUuid = require("crypto").randomUUID();
    const storageFilename = `${userId}_${fileUuid}${ext}`;

    const uniqueName = await generateUniqueName(
      userId,
      targetFolderId,
      file.originalname,
      false,
    );

    const rawFilePath = file.path;

    if (isVideo) {
      const fileDoc = await File.create({
        userId,
        folderId: targetFolderId || null,
        filename: storageFilename,
        originalName: uniqueName,
        mimeType: file.mimetype,
        size: file.size,
        storageFileId: `temp_${fileUuid}`, // Temporary ID until video transcoding & upload finishes
        status: "processing",
        progress: 0,
        storageLocation: "google_drive",
      });

      savedFiles.push(fileDoc);
      processVideo(fileDoc, rawFilePath);
    } else {
      const readStream = fs.createReadStream(rawFilePath);
      const driveUpload = await uploadToDrive(
        readStream,
        storageFilename,
        file.mimetype,
        userId,
      );

      try {
        if (fs.existsSync(rawFilePath)) fs.unlinkSync(rawFilePath);
      } catch (err) { }

      const fileDoc = await File.create({
        userId,
        folderId: targetFolderId || null,
        filename: storageFilename,
        originalName: uniqueName,
        mimeType: file.mimetype,
        size: driveUpload.size || file.size,
        storageFileId: driveUpload.storageFileId,
        status: "ready",
        progress: 100,
        storageLocation: "google_drive",
      });

      savedFiles.push(fileDoc);
    }
  }

  return savedFiles;
};

/**
 * Clean up stale uploads (background processing task).
 */
const sweepStaleUploads = async () => {
  try {
    const staleFiles = await File.find({
      status: "processing",
      storageFileId: /^temp_/,
    });
    if (staleFiles.length > 0) {
      console.log(
        `  ⚙️ [SWEEP] Found ${staleFiles.length} stale processing files. Marking failed...`,
      );
      await File.updateMany(
        { status: "processing", storageFileId: /^temp_/ },
        { status: "failed" },
      );
    }
  } catch (err) {
    console.error("  ❌ [SWEEP ERROR]", err.message);
  }
};

module.exports = {
  getDirectoryContents,
  createFolder,
  renameItem,
  moveItem,
  copyItem,
  deleteItem,
  uploadFiles,
  sweepStaleUploads,
  getFileStreamFromDrive,
};
