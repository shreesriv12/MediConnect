import Notification from "../models/notification.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getRecipientContext = (req) => {
  if (req.doctor) {
    return { recipientId: req.doctor._id, recipientModel: "Doctor" };
  }
  if (req.client) {
    return { recipientId: req.client._id, recipientModel: "Client" };
  }
  throw new ApiError(401, "Unauthorized");
};

export const getMyNotifications = asyncHandler(async (req, res) => {
  const { recipientId, recipientModel } = getRecipientContext(req);
  const limit = Math.min(Number(req.query.limit) || 30, 100);

  const notifications = await Notification.find({ recipientId, recipientModel })
    .sort({ createdAt: -1 })
    .limit(limit);

  return res
    .status(200)
    .json(new ApiResponse(200, notifications, "Notifications fetched successfully"));
});

export const getUnreadNotificationCount = asyncHandler(async (req, res) => {
  const { recipientId, recipientModel } = getRecipientContext(req);
  const count = await Notification.countDocuments({ recipientId, recipientModel, read: false });

  return res
    .status(200)
    .json(new ApiResponse(200, { count }, "Unread notification count fetched successfully"));
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const { recipientId, recipientModel } = getRecipientContext(req);
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.notificationId, recipientId, recipientModel },
    { read: true },
    { new: true }
  );

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, notification, "Notification marked as read"));
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const { recipientId, recipientModel } = getRecipientContext(req);
  await Notification.updateMany({ recipientId, recipientModel, read: false }, { read: true });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "All notifications marked as read"));
});
