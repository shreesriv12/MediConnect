import razorpay from '../utils/razorpay.js';
import Payment from '../models/payment.model.js';
import SlotRequest from '../models/slotRequest.model.js';
import crypto from 'crypto';

export const createOrder = async (req, res) => {
  const { slotRequestId, amount } = req.body;

  if (!slotRequestId || !amount) {
    return res.status(400).json({ success: false, message: "Missing slotRequestId or amount" });
  }

  const options = {
    amount: amount * 100, // in paise
    currency: 'INR',
    receipt: `receipt_${slotRequestId}`,
  };

  try {
    const order = await razorpay.orders.create(options);
    res.status(200).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to create order", error: err.message });
  }
};

export const verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    slotRequestId,
  } = req.body;

  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');

  if (generatedSignature !== razorpay_signature) {
    return res.status(400).json({ success: false, message: 'Payment verification failed' });
  }

  try {
    const slotRequest = await SlotRequest.findById(slotRequestId);
    if (!slotRequest) {
      return res.status(404).json({ success: false, message: "Slot request not found" });
    }

    // Update slot request
    slotRequest.paymentStatus = "paid";
    slotRequest.status = "accepted";
    await slotRequest.save();

    // Create payment record
    const payment = new Payment({
      slotRequestId,
      doctorId: slotRequest.doctorId,
      patientId: slotRequest.patientId,
      amount: slotRequest.fee,
      status: "success",
      transactionId: razorpay_payment_id,
    });

    await payment.save();

    res.status(200).json({ success: true, message: "Payment verified and recorded", payment });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
};



export const getDoctorPaymentHistory = async (req, res) => {
  try {
    // Get doctorId from request (assuming it's passed as query param or from auth middleware)
    const { doctorId } = req.query;
    
    // If doctorId is not in query, you might get it from authenticated user
    // const doctorId = req.user?.id; // if using auth middleware
    
    if (!doctorId) {
      return res.status(400).json({ 
        success: false, 
        message: "Doctor ID is required" 
      });
    }

    // Fetch all payments for this doctor with client details
    const payments = await Payment.find({ doctorId })
      .populate({
        path: 'patientId',
        model: 'Client',
        select: 'name email age phone'
      })
      .populate({
        path: 'slotRequestId',
        select: 'appointmentDate appointmentTime'
      })
      .sort({ createdAt: -1 }); // Sort by latest first

    // Format the response data
    const paymentHistory = payments.map(payment => ({
      paymentId: payment._id,
      transactionId: payment.transactionId,
      amount: payment.amount,
      status: payment.status,
      paymentGateway: payment.paymentGateway,
      paymentDate: payment.createdAt,
      client: {
        name: payment.patientId?.name || 'N/A',
        email: payment.patientId?.email || 'N/A',
        age: payment.patientId?.age || 'N/A',
        phone: payment.patientId?.phone || 'N/A'
      },
      appointment: {
        date: payment.slotRequestId?.appointmentDate || 'N/A',
        time: payment.slotRequestId?.appointmentTime || 'N/A'
      }
    }));

    // Calculate total earnings
    const totalEarnings = payments.reduce((total, payment) => {
      return payment.status === 'success' ? total + payment.amount : total;
    }, 0);

    res.status(200).json({
      success: true,
      data: {
        paymentHistory,
        totalPayments: payments.length,
        totalEarnings,
        successfulPayments: payments.filter(p => p.status === 'success').length
      }
    });

  } catch (error) {
    console.error('Error fetching doctor payment history:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment history",
      error: error.message
    });
  }
};
