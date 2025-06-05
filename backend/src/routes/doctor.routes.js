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
  getAllDoctors,
  getDoctorById
} from '../controllers/doctor.controllers.js'
import { upload } from '../middlewares/multer.middleware.js';
import {isAuthenticated} from '../middlewares/auth.middleware.js'
const router = Router();

// Authentication routes
router.post('/register', upload.single('avatar'), registerDoctor);
router.post('/login', loginDoctor);
router.post('/verify-otp', verifyOtp);
router.post('/verify-email', verifyEmail);
router.post('/logout', isAuthenticated, logoutDoctor);
router.post('/refresh-token', refreshAccessToken);
router.get('/me', isAuthenticated, getCurrentDoctor);
router.patch('/update', isAuthenticated, upload.single('avatar'), updateDoctor);
router.route("/").get(getAllDoctors);          
router.route("/:id").get(getDoctorById);        

export default router;

