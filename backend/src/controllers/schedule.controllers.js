// controllers/scheduleController.js
import Schedule from "../models/schedule.model.js";
export const createSchedule = async (req, res) => {
  try {
    const { date, slots } = req.body;
    const doctorId = req.doctor._id; // ✅ Use the correct field

    const normalizedSlots = Array.isArray(slots) ? slots : [];
    if (!date || !normalizedSlots.length) {
      return res.status(400).json({ message: 'date and at least one slot are required' });
    }

    const existing = await Schedule.findOne({ doctorId, date });
    if (existing) {
      existing.slots.push(...normalizedSlots);
      await existing.save();
      return res.status(200).json({ success: true, schedule: existing, message: 'Slots added to existing schedule' });
    }

    const newSchedule = new Schedule({
      doctorId,
      date,
      slots: normalizedSlots
    });

    await newSchedule.save();
    res.status(201).json({ success: true, schedule: newSchedule });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create schedule', error: err.message });
  }
};

export const getDoctorSchedule = async (req, res) => {
  try {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
      return res.status(400).json({ message: 'doctorId and date are required' });
    }

    const schedule = await Schedule.findOne({ doctorId, date });

    if (!schedule) {
      return res.status(404).json({ message: 'No schedule found for this date' });
    }

    res.json({ success: true, schedule });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching schedule', error: err.message });
  }
};

