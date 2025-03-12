import { v2 as cloud } from "cloudinary";
import fs from "fs";

cloud.config({
  cloud_name: "the-secretary",
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const deleteLocalFile = (path) => {
  try {
    fs.unlinkSync(path);
    console.log(`Successfully deleted ${path}`);
  } catch (err) {
    console.error(`Error deleting file ${path}`, err);
  }
};

const uploadToCloud = async (localPath) => {
  try {
    if (!localPath) return null;
    const res = await cloud.uploader.upload(localPath, {
      use_filename: true,
      unique_filename: false,
      overwrite: true,
      resource_type: "auto",
    });
    console.log("File Uploaded Successfully", res.url);
    deleteLocalFile(localPath);
    return res;
  } catch (err) {
    console.log(err);
    deleteLocalFile(localPath);
    return null;
  }
};

export { uploadToCloud, cloud };