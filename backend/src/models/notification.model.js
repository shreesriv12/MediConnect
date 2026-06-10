import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "recipientModel",
      index: true
    },
    recipientModel: {
      type: String,
      required: true,
      enum: ["Doctor", "Client"]
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "senderModel",
      default: null
    },
    senderModel: {
      type: String,
      enum: ["Doctor", "Client"],
      default: undefined
    },
    type: {
      type: String,
      required: true,
      enum: ["slot_booked", "payment_success", "appointment_reminder", "chat_message", "video_call_invite"]
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    appointment: {
      slotRequestId: { type: mongoose.Schema.Types.ObjectId, ref: "SlotRequest", default: null },
      scheduleId: { type: mongoose.Schema.Types.ObjectId, ref: "Schedule", default: null },
      date: { type: String, default: "" },
      time: { type: String, default: "" }
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    read: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  { timestamps: true }
);

notificationSchema.index({ recipientId: 1, createdAt: -1 });

const Notification = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
export default Notification;
