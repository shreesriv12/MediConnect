import express from 'express';
import {createSchedule,getDoctorSchedule} from '../controllers/schedule.controllers.js'
import { isAuthenticated } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Doctor creates schedule
router.post('/create', isAuthenticated, createSchedule);

// Patient fetches schedule for doctor/date
router.get('/', isAuthenticated, getDoctorSchedule);

export default router;
