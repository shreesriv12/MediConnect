import SlotRequest from "../models/slotRequest.model.js";

export const getDoctorClientPair = ({ userAId, userAType, userBId, userBType }) => {
  if (userAType === "Doctor" && userBType === "Client") {
    return { doctorId: userAId, patientId: userBId };
  }

  if (userAType === "Client" && userBType === "Doctor") {
    return { doctorId: userBId, patientId: userAId };
  }

  return null;
};

export const hasBookedAppointmentBetween = async ({ userAId, userAType, userBId, userBType }) => {
  const pair = getDoctorClientPair({ userAId, userAType, userBId, userBType });
  if (!pair) return false;

  const booking = await SlotRequest.findOne({
    doctorId: pair.doctorId,
    patientId: pair.patientId,
    status: { $ne: "rejected" },
    $or: [
      { paymentStatus: "paid" },
      { status: "accepted" },
      { status: "pending" }
    ]
  }).select("_id");

  return Boolean(booking);
};
