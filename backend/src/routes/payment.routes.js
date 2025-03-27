// paymentRoutes.js
import { Router } from 'express';
import { 
  capturePayment,
  handlePayPalWebhook,
  getPaymentDetails,
  getClientPayments,
  getDoctorPayments
} from '../controllers/payment.controllers.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';

const router = Router();

// Payment processing routes
router.post('/capture', isAuthenticated, capturePayment);
router.post('/webhook', handlePayPalWebhook); // No auth - PayPal webhook

// Client payment routes
router.get('/client', isAuthenticated, getClientPayments);
router.get('/client/:id', isAuthenticated, getPaymentDetails);

// Doctor payment routes
router.get('/doctor', isAuthenticated, getDoctorPayments);

export default router;
