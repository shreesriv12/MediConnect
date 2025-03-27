import express from "express";
import {
  createAppointment,
  confirmAppointment,
  cancelAppointment,
} from "../controllers/appointment.controllers.js";

const router = express.Router();

router.post("/", createAppointment);
router.put("/:appointmentId/confirm", confirmAppointment);
router.put("/:appointmentId/cancel", cancelAppointment);

export default router;
