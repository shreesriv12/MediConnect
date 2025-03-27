import multer from "multer";
import fs from "fs";
import path from "path";

// Ensure the public/temp directory exists
const uploadDir = path.join(process.cwd(), "public", "temp");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });  // Create the folder if it doesn't exist
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log(req.body);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    console.log("MIME TYPE", file.mimetype);
    cb(null, file.originalname);
  }
});

export const upload = multer({ storage });
