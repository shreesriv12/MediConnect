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
  getAllClients,
  getClientById
} from '../controllers/client.controllers.js';
import { upload } from '../middlewares/multer.middleware.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';

const router = Router();

// Authentication routes
router.post('/register', upload.single('avatar'), registerClient);
router.post('/login', loginClient);
router.post('/verify-email', verifyEmail);
router.post('/verify-otp', verifyOtp);
router.post('/logout', isAuthenticated, logoutClient);
router.post('/refresh-token', refreshAccessToken);
router.get('/me', isAuthenticated, getCurrentClient);
router.patch('/update', isAuthenticated, upload.single('avatar'), updateClient);
router.route("/").get(getAllClients);          
router.route("/:id").get(getClientById);  
export default router;