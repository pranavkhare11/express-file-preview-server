const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../../middlewares/authMiddleware");
const { handleUpload } = require("./middlewares/upload.middleware");
const { validateFileSizes } = require("./middlewares/file.validation");
const {
  getExplorerContents,
  createFolder,
  renameItem,
  moveItem,
  copyItem,
  deleteItem,
  uploadFiles,
  previewFile,
  downloadFile,
} = require("./file.controller");

// Explorer Navigation
router.get("/explorer", authenticateToken, getExplorerContents);

// Folder & File VFS Operations
router.post("/folders", authenticateToken, createFolder);
router.patch("/items/rename", authenticateToken, renameItem);
router.patch("/items/move", authenticateToken, moveItem);
router.post("/items/copy", authenticateToken, copyItem);
router.delete("/items", authenticateToken, deleteItem);

// Upload, Preview, Download
router.post(
  "/upload",
  authenticateToken,
  handleUpload,
  validateFileSizes,
  uploadFiles,
);
router.get("/:id/preview", authenticateToken, previewFile);
router.get("/:id/download", authenticateToken, downloadFile);

module.exports = router;
