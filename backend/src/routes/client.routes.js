// clientRoutes.js
import { Router } from 'express';
import { 
  registerClient, 
  loginClient, 
  verifyEmail, 
  logoutClient, 
  updateClient, 
  refreshAccessToken,
  verifyOtp,
  getCurrentClient,
  getDoctors,
  getDoctorDetail,
  getDoctorAvailableSlots,
  bookAppointment,
  getClientAppointments,
  getAppointmentDetail,
  cancelAppointment
} from '../controllers/client.controllers.js';
import { upload } from '../middlewares/multer.middleware.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';

const router = Router();

// Authentication routes
router.post('/register', upload.single('avatar'), registerClient);
router.post('/login', loginClient);
router.get('/verify-email', verifyEmail);
router.post('/verify-otp', verifyOtp);
router.post('/logout', isAuthenticated, logoutClient);
router.post('/refresh-token', refreshAccessToken);
router.get('/me', isAuthenticated, getCurrentClient);
router.patch('/update', isAuthenticated, upload.single('avatar'), updateClient);

// Doctor discovery routes
router.get('/doctors', getDoctors);
router.get('/doctors/:id', getDoctorDetail);
router.get('/doctors/:id/slots', getDoctorAvailableSlots);

// Appointment management routes
router.post('/appointments', isAuthenticated, bookAppointment);
router.get('/appointments', isAuthenticated, getClientAppointments);
router.get('/appointments/:id', isAuthenticated, getAppointmentDetail);
router.patch('/appointments/:id/cancel', isAuthenticated, cancelAppointment);

export default router;