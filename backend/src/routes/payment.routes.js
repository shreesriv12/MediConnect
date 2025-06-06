import express from 'express';
import { createOrder,verifyPayment,getDoctorPaymentHistory } from '../controllers/payment.controllers.js';
const router = express.Router();

// POST /api/payments/order
router.post('/order', createOrder);

// POST /api/payments/verify
router.post('/verify', verifyPayment);
router.get('/history', getDoctorPaymentHistory);

export default router;
