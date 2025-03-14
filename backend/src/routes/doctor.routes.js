import express from "express";
import {
  registerDoctor,
  verifyEmail,
  loginDoctor,
  logoutDoctor,
  getDoctorProfile,
  refreshAccessToken
} from "../controllers/doctor.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import multer from "multer";

const router = express.Router();
const upload = multer({ dest: "uploads/" }); // Temporary storage, Cloudinary will handle actual storage

// Register new doctor with email verification
router.post("/register", upload.single("avatar"), registerDoctor);

// Verify doctor email
router.get("/verify-email", verifyEmail);

// Doctor login
router.post("/login", loginDoctor);

// Doctor logout
router.post("/logout", verifyJWT, logoutDoctor);

// Get doctor profile
router.get("/profile", verifyJWT, getDoctorProfile);


// Refresh access token
router.post("/refresh-token", refreshAccessToken);

export default router;