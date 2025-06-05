import { Router } from 'express';
import {
  initiateCall,
  acceptCall,
  rejectCall,
  endCall,
  getCallHistory,
  rateCall,
  reportIssue,
  getActiveCalls,
  toggleCamera,
  toggleMicrophone,
  toggleScreenShare,
  getMediaPermissions,
  updateMediaQuality
} from '../controllers/video.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';

const router = Router();

// Apply authentication middleware to all routes
router.use(isAuthenticated);

// Basic video call routes
router.route('/initiate').post(initiateCall);
router.route('/:callId/accept').patch(acceptCall);
router.route('/:callId/reject').patch(rejectCall);
router.route('/:callId/end').patch(endCall);
router.route('/history').get(getCallHistory);
router.route('/:callId/rate').post(rateCall);
router.route('/:callId/report-issue').post(reportIssue);
router.route('/active').get(getActiveCalls);

// Media control routes
router.route('/:callId/camera').patch(toggleCamera);
router.route('/:callId/microphone').patch(toggleMicrophone);
router.route('/:callId/screen-share').patch(toggleScreenShare);
router.route('/:callId/media-permissions').get(getMediaPermissions);
router.route('/:callId/quality').patch(updateMediaQuality);

export default router;