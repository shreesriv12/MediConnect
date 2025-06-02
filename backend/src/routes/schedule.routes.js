// scheduleRoutes.js
import { Router } from 'express';
import { 
  createSchedule,
  getDoctorSchedule,
  updateSchedule,
  deleteSchedule,
  generateTimeSlots,
  addHoliday,
  removeHoliday,
  addTemporaryChange,
  getAvailableSlots,
  getScheduleAnalytics
} from '../controllers/schedule.controllers.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';

const router = Router();

// Public routes (no authentication required)
// These routes allow patients/public to view doctor availability
router.get('/doctor/:doctorId/available-slots/:date', getAvailableSlots);

// Protected routes (require authentication)
router.use(isAuthenticated);

// Core schedule management routes (Doctor only)
router.post('/create', createSchedule);
router.get('/my-schedule', getDoctorSchedule);
router.patch('/update/:scheduleId', updateSchedule);
router.delete('/delete/:scheduleId', deleteSchedule);

// Time slot management (Doctor only)
router.post('/generate-slots', generateTimeSlots);
router.get('/available-slots/:date', getAvailableSlots); // Doctor's own slots

// Holiday/Leave management (Doctor only)
router.post('/:scheduleId/holidays', addHoliday);
router.delete('/:scheduleId/holidays/:holidayId', removeHoliday);

// Temporary schedule changes (Doctor only)
router.post('/:scheduleId/temporary-changes', addTemporaryChange);

// Analytics (Doctor only)
router.get('/:scheduleId/analytics', getScheduleAnalytics);

export default router;