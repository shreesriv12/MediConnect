import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  slotRequestId: { type: mongoose.Schema.Types.ObjectId, ref: "SlotRequest", required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["success", "failed"], required: true },
  transactionId: { type: String, required: true },
  paymentGateway: { type: String, default: "Razorpay" },
}, { timestamps: true });

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
