import Appointment from "../models/appointment.model.js";
import Transaction from  "../models/payment.model.js"
import Notification from "../models/notifications.model.js";
export const createAppointment = async (req, res) => {
  try {
    const { doctorId, clientId, date, time_slot, transactionId } = req.body;


     // Create notification
     const notification = new Notification({
        userModel: "Client", 
        userId: clientId, 
        message: "Your appointment request has been sent."
      });
      await notification.save();

      
    // Validate input
    if (!doctorId || !clientId || !date || !time_slot) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if transaction exists (if payment is required)
    if (transactionId) {
      const transaction = await Transaction.findById(transactionId);
      if (!transaction) {
        return res.status(404).json({ message: "Invalid transaction ID" });
      }
    }

    // Create appointment
    const appointment = new Appointment({
      doctorId,
      clientId,
      date,
      time_slot,
      transactionId: transactionId || null,
    });

    await appointment.save();

    // Create a notification for the doctor and client
    const doctorNotification = new Notification({
      userId: doctorId,
      appointmentId: appointment._id,
      message: "You have a new appointment request.",
      type: "appointment",
    });

    const clientNotification = new Notification({
      userId: clientId,
      appointmentId: appointment._id,
      message: "Your appointment request has been sent.",
      type: "appointment",
    });

    await doctorNotification.save();
    await clientNotification.save();

    // Link notifications to appointment
    appointment.notifications.push(doctorNotification._id, clientNotification._id);
    await appointment.save();

    res.status(201).json({ message: "Appointment created successfully", appointment });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


export const confirmAppointment = async (req, res) => {
    try {
      const { appointmentId } = req.params;
  
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
  
      appointment.status = "confirmed";
      await appointment.save();
  
      // Notify client
      const notification = new Notification({
        userId: appointment.clientId,
        appointmentId: appointment._id,
        message: "Your appointment has been confirmed by the doctor.",
        type: "appointment",
      });
  
      await notification.save();
      appointment.notifications.push(notification._id);
      await appointment.save();
  
      res.status(200).json({ message: "Appointment confirmed", appointment });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  };

  
  export const cancelAppointment = async (req, res) => {
    try {
      const { appointmentId } = req.params;
  
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
  
      appointment.status = "cancelled";
      await appointment.save();
  
      // Notify both client and doctor
      const notifications = [
        new Notification({
          userId: appointment.clientId,
          appointmentId: appointment._id,
          message: "Your appointment has been cancelled.",
          type: "appointment",
        }),
        new Notification({
          userId: appointment.doctorId,
          appointmentId: appointment._id,
          message: "An appointment has been cancelled.",
          type: "appointment",
        }),
      ];
  
      await Notification.insertMany(notifications);
      appointment.notifications.push(...notifications.map((n) => n._id));
      await appointment.save();
  
      res.status(200).json({ message: "Appointment cancelled", appointment });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  };
  