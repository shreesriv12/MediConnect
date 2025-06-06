import mongoose from "mongoose";

const slotSchema = new mongoose.Schema({
  time: { type: String, required: true },
  fee: { type: Number, required: true },
  isBooked: { type: Boolean, default: false },
  bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'SlotRequest', default: null },
});

const scheduleSchema = new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  date: { type: String, required: true }, // format: "YYYY-MM-DD"
  slots: [slotSchema],
}, { timestamps: true });

const Schedule = mongoose.model('Schedule', scheduleSchema);
export default Schedule;
