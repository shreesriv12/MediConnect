import fs from "fs";
import UploadedFile from "../models/uploadedFile.model.js";
import { ingestUploadedFile } from "../services/rag.service.js";

const queue = [];
let active = false;

const removeEphemeralSource = async (uploadedFile, sourcePath) => {
  if (!sourcePath || uploadedFile.localPath === sourcePath) return;

  try {
    await fs.promises.unlink(sourcePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("[RAG Queue] Failed to remove ingestion temp file:", error.message);
    }
  }
};

const runNext = async () => {
  if (active || queue.length === 0) return;
  active = true;

  const job = queue.shift();

  try {
    const uploadedFile = await UploadedFile.findOne({ fileId: job.fileId });
    if (!uploadedFile) {
      console.warn("[RAG Queue] Uploaded file no longer exists:", job.fileId);
      return;
    }

    uploadedFile.ragStatus = "processing";
    uploadedFile.ragError = null;
    await uploadedFile.save();

    console.log("[RAG Queue] Starting ingestion:", {
      fileId: uploadedFile.fileId,
      sessionId: uploadedFile.sessionId,
      fileName: uploadedFile.fileName,
    });

    const result = await ingestUploadedFile({
      uploadedFile,
      sourcePath: job.sourcePath,
    });

    uploadedFile.ragStatus = result.skipped ? "skipped" : "indexed";
    uploadedFile.chunkCount = result.chunkCount || 0;
    uploadedFile.ragError = result.error || null;
    await uploadedFile.save();

    console.log("[RAG Queue] Ingestion finished:", {
      fileId: uploadedFile.fileId,
      status: uploadedFile.ragStatus,
      chunks: uploadedFile.chunkCount,
    });
  } catch (error) {
    console.error("[RAG Queue] Ingestion failed:", error);
    await UploadedFile.findOneAndUpdate(
      { fileId: job.fileId },
      {
        ragStatus: "failed",
        ragError: error.message,
      }
    );
  } finally {
    const uploadedFile = await UploadedFile.findOne({ fileId: job.fileId });
    if (uploadedFile) {
      await removeEphemeralSource(uploadedFile, job.sourcePath);
    }

    active = false;
    setImmediate(runNext);
  }
};

export const enqueueRagIngestion = ({ fileId, sourcePath }) => {
  queue.push({ fileId, sourcePath });
  console.log("[RAG Queue] Job enqueued:", { fileId, depth: queue.length });
  setImmediate(runNext);
};
