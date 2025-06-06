// controllers/scheduleController.js
import Schedule from "../models/schedule.model.js";
export const createSchedule = async (req, res) => {
  try {
    const { date, slots } = req.body;
    const doctorId = req.doctor._id; // ✅ Use the correct field

    const existing = await Schedule.findOne({ doctorId, date });
    if (existing) {
      return res.status(400).json({ message: 'Schedule already exists for this date' });
    }

    const newSchedule = new Schedule({
      doctorId,
      date,
      slots
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

