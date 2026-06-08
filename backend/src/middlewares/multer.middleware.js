import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// Ensure the public/temp directory exists
const uploadDir = path.join(process.cwd(), "public", "temp");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });  // Create the folder if it doesn't exist
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || "");
    const safeBaseName = path
      .basename(file.originalname || "upload", ext)
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 80);
    cb(null, `${Date.now()}-${crypto.randomUUID()}-${safeBaseName}${ext}`);
  }
});

export const upload = multer({ storage });

const allowedChatMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/jpg",
]);

const allowedChatExtensions = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".txt",
  ".png",
  ".jpg",
  ".jpeg",
]);

const createUploadError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const chatUpload = multer({
  storage,
  limits: {
    fileSize: Number(process.env.CHAT_UPLOAD_MAX_SIZE_BYTES) || 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const isAllowedMime = allowedChatMimeTypes.has(file.mimetype);
    const isAllowedExtension = allowedChatExtensions.has(extension);

    if (!isAllowedMime || !isAllowedExtension) {
      return cb(
        createUploadError(
          "Unsupported file type. Upload PDF, DOC, DOCX, TXT, PNG, JPG, or JPEG files only."
        )
      );
    }

    return cb(null, true);
  },
});

export const CHAT_UPLOAD_ALLOWED_EXTENSIONS = Array.from(allowedChatExtensions);
