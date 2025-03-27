// doctorRoutes.js
import { Router } from 'express';
import { 
  registerDoctor, 
  loginDoctor, 
  verifyOtp, 
  verifyEmail, 
  logoutDoctor, 
  refreshAccessToken,
  getCurrentDoctor,
  updateDoctor,
  createAppointmentSlot,
  getDoctorSlots,
  updateAppointmentSlot,
  deleteAppointmentSlot,
  getDoctorAppointments,
  updateAppointmentStatus
} from '../controllers/doctor.controllers.js'
import { upload } from '../middlewares/multer.middleware.js';
import {isAuthenticated} from '../middlewares/auth.middleware.js'
const router = Router();

// Authentication routes
router.post('/register', upload.single('avatar'), registerDoctor);
router.post('/login', loginDoctor);
router.post('/verify-otp', verifyOtp);
router.get('/verify-email', verifyEmail);
router.post('/logout', isAuthenticated, logoutDoctor);
router.post('/refresh-token', refreshAccessToken);
router.get('/me', isAuthenticated, getCurrentDoctor);
router.patch('/update', isAuthenticated, upload.single('avatar'), updateDoctor);

// Appointment management routes
router.post('/slots', isAuthenticated, createAppointmentSlot);
router.get('/slots', isAuthenticated, getDoctorSlots);
router.patch('/slots/:id', isAuthenticated, updateAppointmentSlot);
router.delete('/slots/:id', isAuthenticated, deleteAppointmentSlot);
router.get('/appointments', isAuthenticated, getDoctorAppointments);
router.patch('/appointments/:id/status', isAuthenticated, updateAppointmentStatus);

export default router;

