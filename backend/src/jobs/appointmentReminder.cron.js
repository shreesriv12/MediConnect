import cron from "node-cron";
import SlotRequest from "../models/slotRequest.model.js";
import { notifyAppointmentReminder } from "../services/notification.service.js";

const REMINDER_WINDOW_MINUTES = Number(process.env.APPOINTMENT_REMINDER_WINDOW_MINUTES || 30);
const CRON_EXPRESSION = process.env.APPOINTMENT_REMINDER_CRON || "*/5 * * * *";

const getAppointmentDateTime = (slotRequest) => {
  if (!slotRequest.date || !slotRequest.time) return null;

  const time = slotRequest.time.trim();
  const normalizedTime = /^\d{1,2}:\d{2}$/.test(time)
    ? time
    : time.replace(/\s+/g, "").toUpperCase();

  if (!/^\d{1,2}:\d{2}$/.test(normalizedTime)) return null;

  const [hours, minutes] = normalizedTime.split(":").map(Number);
  if (hours > 23 || minutes > 59) return null;

  return new Date(`${slotRequest.date}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00+05:30`);
};

const sendDueAppointmentReminders = async () => {
  const now = new Date();
  const reminderCutoff = new Date(now.getTime() + REMINDER_WINDOW_MINUTES * 60 * 1000);

  const candidates = await SlotRequest.find({
    status: "accepted",
    paymentStatus: "paid",
    reminderSentAt: null
  })
    .populate("doctorId", "name")
    .populate("patientId", "name")
    .limit(100);

  for (const slotRequest of candidates) {
    const appointmentAt = getAppointmentDateTime(slotRequest);
    if (!appointmentAt || appointmentAt < now || appointmentAt > reminderCutoff) {
      continue;
    }

    await notifyAppointmentReminder({
      doctorId: slotRequest.doctorId._id || slotRequest.doctorId,
      patientId: slotRequest.patientId._id || slotRequest.patientId,
      patientName: slotRequest.patientId?.name,
      doctorName: slotRequest.doctorId?.name,
      slotRequest
    });

    slotRequest.reminderSentAt = now;
    await slotRequest.save();
  }
};

export const startAppointmentReminderCron = () => {
  if (process.env.DISABLE_APPOINTMENT_REMINDER_CRON === "true") {
    console.log("[ReminderCron] Appointment reminder cron disabled");
    return null;
  }

  const task = cron.schedule(
    CRON_EXPRESSION,
    () => {
      sendDueAppointmentReminders().catch((error) => {
        console.error("[ReminderCron] Failed to send appointment reminders:", error.message);
      });
    },
    {
      timezone: "Asia/Kolkata"
    }
  );

  console.log(`[ReminderCron] Appointment reminder cron started: ${CRON_EXPRESSION}`);
  return task;
};
