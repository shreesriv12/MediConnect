import Schedule from "../models/schedule.model.js";
import SlotRequest from "../models/slotRequest.model.js";

export const isSlotAvailable = (slot) => Boolean(slot && !slot.isBooked && !slot.requestId);

export const createAndLockSlotRequest = async ({
  doctorId,
  patientId,
  scheduleId,
  slotIndex,
  status = "pending",
  paymentStatus = "unpaid"
}) => {
  const schedule = await Schedule.findById(scheduleId);
  if (!schedule) {
    const error = new Error("Schedule not found");
    error.statusCode = 404;
    throw error;
  }

  const slot = schedule.slots[slotIndex];
  if (!slot) {
    const error = new Error("Slot index invalid");
    error.statusCode = 400;
    throw error;
  }

  if (!isSlotAvailable(slot)) {
    const error = new Error("Slot not available");
    error.statusCode = 400;
    throw error;
  }

  const request = await SlotRequest.create({
    doctorId,
    patientId,
    scheduleId,
    slotIndex,
    date: schedule.date,
    time: slot.time,
    fee: slot.fee,
    status,
    paymentStatus
  });

  slot.requestId = request._id;
  slot.isBooked = true;
  slot.bookedBy = patientId;
  await schedule.save();

  return { request, schedule, slot };
};

export const confirmSlotRequestBooking = async (slotRequestId) => {
  const slotRequest = await SlotRequest.findById(slotRequestId);
  if (!slotRequest) return null;

  const schedule = await Schedule.findById(slotRequest.scheduleId);
  if (!schedule) return { slotRequest, schedule: null, slot: null };

  const slot = schedule.slots[slotRequest.slotIndex];
  if (slot) {
    slot.requestId = slotRequest._id;
    slot.isBooked = true;
    slot.bookedBy = slotRequest.patientId;
    await schedule.save();
  }

  return { slotRequest, schedule, slot };
};
