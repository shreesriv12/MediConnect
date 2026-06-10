import Notification from "../models/notification.model.js";

export const createNotification = async ({
  recipientId,
  recipientModel,
  senderId = null,
  senderModel = null,
  type,
  title,
  message,
  appointment = {},
  metadata = {}
}) => {
  const notification = {
    recipientId,
    recipientModel,
    type,
    title,
    message,
    appointment,
    metadata
  };

  if (senderId && senderModel) {
    notification.senderId = senderId;
    notification.senderModel = senderModel;
  }

  return Notification.create(notification);
};

export const notifyDoctorSlotBooked = ({ doctorId, patientId, patientName, slotRequest }) => {
  return createNotification({
    recipientId: doctorId,
    recipientModel: "Doctor",
    senderId: patientId,
    senderModel: "Client",
    type: "slot_booked",
    title: "New appointment reserved",
    message: `${patientName || "A patient"} reserved ${slotRequest.time} on ${slotRequest.date}.`,
    appointment: {
      slotRequestId: slotRequest._id,
      scheduleId: slotRequest.scheduleId,
      date: slotRequest.date,
      time: slotRequest.time
    }
  });
};

export const notifyAppointmentPaid = async ({ doctorId, patientId, patientName, doctorName, slotRequest }) => {
  await Promise.all([
    createNotification({
      recipientId: doctorId,
      recipientModel: "Doctor",
      senderId: patientId,
      senderModel: "Client",
      type: "payment_success",
      title: "Appointment payment completed",
      message: `${patientName || "A patient"} paid for the ${slotRequest.time} appointment on ${slotRequest.date}.`,
      appointment: {
        slotRequestId: slotRequest._id,
        scheduleId: slotRequest.scheduleId,
        date: slotRequest.date,
        time: slotRequest.time
      }
    }),
    createNotification({
      recipientId: patientId,
      recipientModel: "Client",
      senderId: doctorId,
      senderModel: "Doctor",
      type: "payment_success",
      title: "Appointment confirmed",
      message: `Your appointment with Dr. ${doctorName || "your doctor"} is confirmed for ${slotRequest.time} on ${slotRequest.date}.`,
      appointment: {
        slotRequestId: slotRequest._id,
        scheduleId: slotRequest.scheduleId,
        date: slotRequest.date,
        time: slotRequest.time
      }
    })
  ]);
};

export const notifyAppointmentReminder = async ({ doctorId, patientId, patientName, doctorName, slotRequest }) => {
  await Promise.all([
    createNotification({
      recipientId: doctorId,
      recipientModel: "Doctor",
      senderId: patientId,
      senderModel: "Client",
      type: "appointment_reminder",
      title: "Upcoming appointment reminder",
      message: `Reminder: ${patientName || "A patient"} has an appointment at ${slotRequest.time} on ${slotRequest.date}.`,
      appointment: {
        slotRequestId: slotRequest._id,
        scheduleId: slotRequest.scheduleId,
        date: slotRequest.date,
        time: slotRequest.time
      }
    }),
    createNotification({
      recipientId: patientId,
      recipientModel: "Client",
      senderId: doctorId,
      senderModel: "Doctor",
      type: "appointment_reminder",
      title: "Upcoming appointment reminder",
      message: `Reminder: your appointment with Dr. ${doctorName || "your doctor"} is at ${slotRequest.time} on ${slotRequest.date}.`,
      appointment: {
        slotRequestId: slotRequest._id,
        scheduleId: slotRequest.scheduleId,
        date: slotRequest.date,
        time: slotRequest.time
      }
    })
  ]);
};

export const notifyChatMessage = ({ recipientId, recipientModel, senderId, senderModel, senderName, chatId, message }) => {
  return createNotification({
    recipientId,
    recipientModel,
    senderId,
    senderModel,
    type: "chat_message",
    title: "New chat message",
    message: `${senderName || "Someone"}: ${String(message || "").slice(0, 120)}`,
    metadata: { chatId }
  });
};

export const notifyVideoCallInvite = ({ recipientId, recipientModel, senderId, senderModel, senderName, callId, roomId }) => {
  return createNotification({
    recipientId,
    recipientModel,
    senderId,
    senderModel,
    type: "video_call_invite",
    title: "Incoming video call",
    message: `${senderName || "Someone"} is calling you.`,
    metadata: { callId, roomId }
  });
};
