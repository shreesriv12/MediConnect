import Payment from "../models/payment.model.js";
import Appointment from "../models/appointment.model.js";
import AppointmentSlot from "../models/appointmentSlot.model.js";
import { capturePayPalOrder } from "../utils/paypal.js";

// Capture PayPal Payment
const capturePayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    
    // Capture PayPal order
    const captureData = await capturePayPalOrder(orderId);
    
    // Find payment by PayPal order ID
    const payment = await Payment.findOne({ paypalOrderId: orderId });
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    // Update payment status
    payment.status = 'completed';
    payment.paypalPaymentId = captureData.id;
    payment.paymentDate = new Date();
    await payment.save();
    
    // Update appointment status
    const appointment = await Appointment.findById(payment.appointmentId);
    if (appointment) {
      appointment.status = 'confirmed';
      appointment.paymentStatus = 'completed';
      appointment.paymentId = captureData.id;
      await appointment.save();
      
      // Mark slot as booked
      await AppointmentSlot.findByIdAndUpdate(appointment.slotId, { isBooked: true });
    }
    
    res.status(200).json({
      success: true,
      message: 'Payment completed successfully',
      data: {
        payment,
        appointment
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PayPal Webhook Handler
const handlePayPalWebhook = async (req, res) => {
  try {
    const { event_type, resource } = req.body;
    
    // Handle payment capture completed event
    if (event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const paypalPaymentId = resource.id;
      
      // Find payment by PayPal payment ID
      const payment = await Payment.findOne({ paypalPaymentId });
      
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }
      
      if (payment.status !== 'completed') {
        // Update payment status
        payment.status = 'completed';
        payment.paymentDate = new Date();
        await payment.save();
        
        // Update appointment status
        const appointment = await Appointment.findById(payment.appointmentId);
        if (appointment) {
          appointment.status = 'confirmed';
          appointment.paymentStatus = 'completed';
          await appointment.save();
          
          // Mark slot as booked
          await AppointmentSlot.findByIdAndUpdate(appointment.slotId, { isBooked: true });
        }
      }
    }
    // Handle payment refunded event
    else if (event_type === 'PAYMENT.CAPTURE.REFUNDED') {
      const paypalPaymentId = resource.id;
      
      // Find payment by PayPal payment ID
      const payment = await Payment.findOne({ paypalPaymentId });
      
      if (payment) {
        // Update payment status
        payment.status = 'refunded';
        await payment.save();
        
        // Update appointment status
        const appointment = await Appointment.findById(payment.appointmentId);
        if (appointment) {
          appointment.status = 'cancelled';
          appointment.paymentStatus = 'refunded';
          await appointment.save();
          
          // Release the slot
          await AppointmentSlot.findByIdAndUpdate(appointment.slotId, { isBooked: false });
        }
      }
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    // Always return 200 to PayPal to acknowledge receipt
    console.error('PayPal webhook error:', error);
    res.status(200).json({ success: true });
  }
};

// Get payment details (for client)
const getPaymentDetails = async (req, res) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.id,
      clientId: req.user.id
    });
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all payments for client
const getClientPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ clientId: req.user.id })
      .populate('appointmentId')
      .populate('doctorId', 'name specialization')
      .sort({ createdAt: -1 });
    
    res.status(200).json({ success: true, count: payments.length, data: payments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all payments for doctor
const getDoctorPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ doctorId: req.user.id })
      .populate('appointmentId')
      .populate('clientId', 'name email')
      .sort({ createdAt: -1 });
    
    res.status(200).json({ success: true, count: payments.length, data: payments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export {
  capturePayment,
  handlePayPalWebhook,
  getPaymentDetails,
  getClientPayments,
  getDoctorPayments
};