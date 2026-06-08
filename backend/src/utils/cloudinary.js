import { v2 as cloud } from "cloudinary";
import fs from "fs";
import path from "path";

cloud.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_SECRET,
  secure: true,
});

const getFormatFromPublicId = (publicId) => {
  const extension = path.extname(publicId || "").replace(".", "");
  return extension || undefined;
};

const deleteLocalFile = (path) => {
  try {
    fs.unlinkSync(path);
    console.log(`Successfully deleted ${path}`);
  } catch (err) {
    console.error(`Error deleting file ${path}`, err);
  }
};

const uploadToCloud = async (localPath, options = {}) => {
  try {
    const { cleanup = true } = options;
    console.log("Uploading file to Cloudinary:", localPath);
    const extension = path.extname(localPath).toLowerCase();
    const resourceType = [".pdf", ".doc", ".docx", ".txt"].includes(extension)
      ? "raw"
      : "auto";

    const res = await cloud.uploader.upload(localPath, {
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      resource_type: resourceType,
    });

    const secureUrl = res.secure_url || res.url?.replace(/^http:\/\//, "https://");

    console.log("Cloudinary upload completed:", {
      public_id: res.public_id,
      resource_type: res.resource_type,
      format: res.format,
      secure_url: secureUrl,
    });
    if (cleanup) {
      deleteLocalFile(localPath);
    }
    return {
      ...res,
      url: secureUrl,
      secure_url: secureUrl,
    };
  } catch (err) {
    console.error("Cloudinary Upload Error:", err);
    deleteLocalFile(localPath);
    return null;
  }
};


const getCloudinaryFileUrl = (
  { public_id, publicId, resource_type, resourceType, type = "upload", secure_url, url },
  { attachment = false, expiresInSeconds } = {}
) => {
  const id = public_id || publicId;
  const resolvedResourceType = resource_type || resourceType || "image";

  if (resolvedResourceType === "raw" && id) {
    return cloud.utils.private_download_url(id, getFormatFromPublicId(id), {
      resource_type: "raw",
      type,
      attachment,
      expires_at:
        Math.floor(Date.now() / 1000) +
        (expiresInSeconds ||
          Number(process.env.CLOUDINARY_SIGNED_URL_EXPIRES_SECONDS) ||
          60 * 60),
    });
  }

  return secure_url || url?.replace(/^http:\/\//, "https://");
};

export { uploadToCloud, getCloudinaryFileUrl, cloud };
