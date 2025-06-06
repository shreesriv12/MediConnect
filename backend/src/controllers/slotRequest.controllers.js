import SlotRequest from '../models/slotRequest.model.js';
import Schedule from '../models/schedule.model.js';

export const requestSlot = async (req, res) => {
  try {
    console.log('Received slot request:', req.body);
    console.log('Request user:', req.user, 'Doctor:', req.doctor, 'Client:', req.client);

    const { doctorId, scheduleId, slotIndex } = req.body;

    // Use only req.client for patientId
    const patientId = req.client?._id;
    if (!patientId) {
      return res.status(401).json({ message: "Unauthorized: Client user not found in request" });
    }

    if (!doctorId || !scheduleId || slotIndex === undefined) {
      console.error('Missing required fields:', { doctorId, scheduleId, slotIndex });
      return res.status(400).json({ message: "doctorId, scheduleId, and slotIndex are required" });
    }

    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      console.error('Schedule not found for ID:', scheduleId);
      return res.status(404).json({ message: "Schedule not found" });
    }

    const slot = schedule.slots[slotIndex];
    if (!slot) {
      console.error('Slot index invalid:', slotIndex, 'Slots length:', schedule.slots.length);
      return res.status(400).json({ message: "Slot index invalid" });
    }
    if (slot.isBooked) {
      console.error('Slot already booked:', slotIndex);
      return res.status(400).json({ message: "Slot not available" });
    }

    const newRequest = await SlotRequest.create({
      doctorId,
      patientId,
      scheduleId,
      slotIndex,
      date: schedule.date,
      time: slot.time,
      fee: slot.fee
    });

    slot.requestId = newRequest._id;
    await schedule.save();

    console.log('Slot requested successfully:', newRequest._id);
    res.status(201).json({ success: true, request: newRequest });
  } catch (err) {
    console.error('Error in requestSlot:', err);
    res.status(500).json({ message: 'Failed to request slot', error: err.message });
  }
};

export const updateSlotRequestStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const request = await SlotRequest.findById(requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });

    const schedule = await Schedule.findById(request.scheduleId);
    if (!schedule) return res.status(404).json({ message: "Schedule not found" });

    const slot = schedule.slots[request.slotIndex];
    if (!slot) return res.status(400).json({ message: "Invalid slot" });

    request.status = status;
    if (status === 'accepted') {
      request.paymentStatus = 'unpaid';
      slot.isBooked = true;
      slot.bookedBy = request.patientId;
    } else {
      slot.requestId = null;
    }

    await request.save();
    await schedule.save();

    res.json({ success: true, message: `Request ${status}` });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update request', error: err.message });
  }
};
