import mongoose from "mongoose";

const uploadedFileSchema = new mongoose.Schema(
  {
    fileId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileType: {
      type: String,
      required: true,
      trim: true,
    },
    fileExtension: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    storageProvider: {
      type: String,
      enum: ["s3", "local", "cloudinary"],
      default: "local",
    },
    storageKey: {
      type: String,
      default: null,
    },
    localPath: {
      type: String,
      default: null,
    },
    ragStatus: {
      type: String,
      enum: ["pending", "processing", "indexed", "failed", "skipped"],
      default: "pending",
      index: true,
    },
    ragError: {
      type: String,
      default: null,
    },
    chunkCount: {
      type: Number,
      default: 0,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

uploadedFileSchema.index({ sessionId: 1, uploadedAt: -1 });
uploadedFileSchema.index({ sessionId: 1, doctorId: 1 });

export default mongoose.model("UploadedFile", uploadedFileSchema);
