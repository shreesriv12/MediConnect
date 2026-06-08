import { Router } from "express";
import { getChatFiles, uploadChatFile } from "../controllers/upload.controller.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import { chatUpload } from "../middlewares/multer.middleware.js";

const router = Router();

router.post("/upload", isAuthenticated, chatUpload.single("file"), uploadChatFile);
router.get("/chats/:sessionId/files", isAuthenticated, getChatFiles);

export default router;
