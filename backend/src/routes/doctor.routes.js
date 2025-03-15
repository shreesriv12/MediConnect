import express from "express";
import {
  registerDoctor,
  loginDoctor,
  verifyEmail,
  verifyOtp,
  logoutDoctor,
  refreshAccessToken,
  getCurrentDoctor,
  updateDoctor
} from "../controllers/doctor.controllers.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js"
import multer from "multer";

const router = express.Router();

// ** Multer setup for handling file uploads **
const upload = multer({ dest: "uploads/" });

// ** Doctor authentication routes **
router.post("/register", upload.single("avatar"), registerDoctor);
router.post("/login", loginDoctor);
router.get("/verify-email", verifyEmail);
router.post("/logout", isAuthenticated, logoutDoctor);
router.post("/refresh-token", refreshAccessToken);
router.get("/profile", getCurrentDoctor);
router.put("/update", isAuthenticated, upload.single("file"), updateDoctor); // Update doctor route
router.post("/verify-otp", verifyOtp);

export default router;
