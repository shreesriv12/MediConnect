import express from 'express';
import {
  requestSlot,
  updateSlotRequestStatus
} from '../controllers/slotRequest.controllers.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Patient requests a slot
router.post('/request', isAuthenticated, requestSlot);

// Doctor accepts/rejects slot
router.put('/:requestId/status', isAuthenticated, updateSlotRequestStatus);

export default router;
