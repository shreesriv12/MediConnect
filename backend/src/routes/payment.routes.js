import express from 'express';
import { createOrder,verifyPayment } from '../controllers/payment.controllers.js';
const router = express.Router();

// POST /api/payments/order
router.post('/order', createOrder);

// POST /api/payments/verify
router.post('/verify', verifyPayment);

export default router;
