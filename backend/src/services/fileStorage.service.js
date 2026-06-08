import fs from "fs";
import path from "path";
import { PutObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const uploadsRoot = path.join(process.cwd(), "public", "uploads", "chat");

const s3IsConfigured = () =>
  Boolean(process.env.AWS_S3_BUCKET && process.env.AWS_REGION);

const getS3Client = () => {
  const credentials =
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined;

  return new S3Client({
    region: process.env.AWS_REGION,
    credentials,
  });
};

const deleteTempFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("[Storage] Failed to delete temp file:", error.message);
    }
  }
};

const getPublicBaseUrl = (req) => {
  if (process.env.BACKEND_PUBLIC_URL) {
    return process.env.BACKEND_PUBLIC_URL.replace(/\/+$/, "");
  }

  return `${req.protocol}://${req.get("host")}`;
};

const storeLocally = async ({ file, sessionId, fileId, req }) => {
  const extension = path.extname(file.originalname || file.filename);
  const safeName = `${fileId}${extension.toLowerCase()}`;
  const sessionDir = path.join(uploadsRoot, String(sessionId));
  const destination = path.join(sessionDir, safeName);

  await fs.promises.mkdir(sessionDir, { recursive: true });
  await fs.promises.rename(file.path, destination);

  const relativeUrl = `/uploads/chat/${sessionId}/${safeName}`;

  return {
    storageProvider: "local",
    storageKey: relativeUrl,
    localPath: destination,
    fileUrl: `${getPublicBaseUrl(req)}${relativeUrl}`,
  };
};

const storeInS3 = async ({ file, sessionId, fileId, keepLocalCopy = false }) => {
  const bucket = process.env.AWS_S3_BUCKET;
  const extension = path.extname(file.originalname || file.filename).toLowerCase();
  const key = `chat/${sessionId}/${fileId}${extension}`;
  const client = getS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fs.createReadStream(file.path),
      ContentType: file.mimetype,
      Metadata: {
        originalName: encodeURIComponent(file.originalname || "upload"),
        sessionId: String(sessionId),
        fileId,
      },
    })
  );

  const fileUrl = await getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
    { expiresIn: Number(process.env.AWS_SIGNED_URL_EXPIRES_SECONDS) || 3600 }
  );

  if (!keepLocalCopy) {
    await deleteTempFile(file.path);
  }

  return {
    storageProvider: "s3",
    storageKey: key,
    localPath: null,
    fileUrl,
  };
};

export const storeChatFile = async ({ file, sessionId, fileId, req, keepLocalCopy = false }) => {
  if (s3IsConfigured()) {
    try {
      return await storeInS3({ file, sessionId, fileId, keepLocalCopy });
    } catch (error) {
      console.error("[Storage] S3 upload failed, falling back to local storage:", error.message);
    }
  }

  return storeLocally({ file, sessionId, fileId, req });
};

export const resolveLocalReadablePath = (uploadedFile) => {
  if (uploadedFile.localPath) return uploadedFile.localPath;
  return null;
};
