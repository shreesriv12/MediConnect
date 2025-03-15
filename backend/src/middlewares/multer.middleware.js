import multer from "multer";

// Basic multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log(req.body);
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    console.log("MIME TYPE", file.mimetype);
    cb(null, file.originalname);
  },
});

export const upload = multer({ storage });