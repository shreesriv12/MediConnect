import path from "path";
import { v4 as uuidv4 } from "uuid";
import UploadedFile from "../models/uploadedFile.model.js";
import { enqueueRagIngestion } from "../jobs/ragQueue.js";
import {
  appendChatMessage,
  assertDoctorInSession,
  emitChatMessage,
  emitFileReceive,
  findChatForParticipant,
  getRequestUser,
} from "../services/chatSession.service.js";
import { storeChatFile } from "../services/fileStorage.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toUploadedFileResponse = (uploadedFile) => ({
  id: uploadedFile.fileId,
  fileId: uploadedFile.fileId,
  sessionId: uploadedFile.sessionId,
  doctorId: uploadedFile.doctorId,
  fileName: uploadedFile.fileName,
  fileType: uploadedFile.fileType,
  fileUrl: uploadedFile.fileUrl,
  fileSize: uploadedFile.fileSize,
  ragStatus: uploadedFile.ragStatus,
  chunkCount: uploadedFile.chunkCount,
  uploadedAt: uploadedFile.uploadedAt,
});

export const uploadChatFile = asyncHandler(async (req, res) => {
  const { sessionId, doctorId } = req.body;

  if (!sessionId || !doctorId) {
    throw new ApiError(400, "sessionId and doctorId are required");
  }

  if (!req.file) {
    throw new ApiError(400, "A file is required");
  }

  const currentUser = getRequestUser(req);
  if (currentUser.userType !== "Doctor") {
    throw new ApiError(403, "Only doctors can upload documents for RAG ingestion");
  }

  if (doctorId.toString() !== currentUser.userId.toString()) {
    throw new ApiError(403, "doctorId must match the authenticated doctor");
  }

  await assertDoctorInSession(sessionId, currentUser.userId);

  const fileId = uuidv4();
  const storageResult = await storeChatFile({
    file: req.file,
    sessionId,
    fileId,
    req,
    keepLocalCopy: true,
  });

  const uploadedFile = await UploadedFile.create({
    fileId,
    sessionId,
    doctorId: currentUser.userId,
    fileName: req.file.originalname,
    fileType: req.file.mimetype,
    fileExtension: path.extname(req.file.originalname).toLowerCase(),
    fileSize: req.file.size,
    fileUrl: storageResult.fileUrl,
    storageProvider: storageResult.storageProvider,
    storageKey: storageResult.storageKey,
    localPath: storageResult.localPath,
    ragStatus: "pending",
  });

  const messageType = req.file.mimetype.startsWith("image/") ? "image" : "file";
  const savedMessage = await appendChatMessage(sessionId, {
    content: req.file.originalname,
    messageType,
    sender: currentUser,
    fileUrl: uploadedFile.fileUrl,
    fileId: uploadedFile.fileId,
    fileName: uploadedFile.fileName,
    fileSize: uploadedFile.fileSize,
    fileType: uploadedFile.fileType,
    metadata: {
      ragStatus: uploadedFile.ragStatus,
      storageProvider: uploadedFile.storageProvider,
    },
  });

  emitFileReceive(req.io, uploadedFile);
  emitChatMessage(req.io, sessionId, savedMessage, currentUser.userType);

  enqueueRagIngestion({
    fileId: uploadedFile.fileId,
    sourcePath: uploadedFile.localPath || req.file.path,
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        file: toUploadedFileResponse(uploadedFile),
        message: savedMessage,
      },
      "File uploaded successfully. RAG ingestion has started."
    )
  );
});

export const getChatFiles = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const currentUser = getRequestUser(req);

  await findChatForParticipant(sessionId, currentUser.userId);

  const files = await UploadedFile.find({ sessionId })
    .sort({ uploadedAt: -1 })
    .limit(100);

  return res
    .status(200)
    .json(new ApiResponse(200, files.map(toUploadedFileResponse), "Files retrieved successfully"));
});
