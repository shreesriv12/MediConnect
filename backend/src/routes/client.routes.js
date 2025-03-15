import express from "express";
import {
  registerClient,
  loginClient,
  verifyEmail,
  verifyOtp,
  logoutClient,
  refreshAccessToken,
  getCurrentClient,
  updateClient
} from "../controllers/client.controllers.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import multer from "multer";

const router = express.Router();

// ** Multer setup for handling file uploads **
const upload = multer({ dest: "uploads/" });

// ** Client authentication routes **
router.post("/register", upload.single("avatar"), registerClient);
router.post("/login", loginClient);
router.get("/verify-email", verifyEmail);
router.post("/logout", isAuthenticated, logoutClient);
router.post("/refresh-token", refreshAccessToken);
router.get("/profile", isAuthenticated, getCurrentClient);
router.put("/update", isAuthenticated, upload.single("avatar"), updateClient); 
router.post("/verify-otp", verifyOtp);

export default router;
