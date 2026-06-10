import { Router } from "express";
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead
} from "../controllers/notification.controllers.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", isAuthenticated, getMyNotifications);
router.get("/unread-count", isAuthenticated, getUnreadNotificationCount);
router.patch("/read-all", isAuthenticated, markAllNotificationsRead);
router.patch("/:notificationId/read", isAuthenticated, markNotificationRead);

export default router;
