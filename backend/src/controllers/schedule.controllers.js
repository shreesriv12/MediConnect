import Schedule from "../models/schedule.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// Create a new schedule for a doctor
const createSchedule = asyncHandler(async (req, res) => {
  const { 
    scheduleType, 
    weeklySchedule, 
    specificDate, 
    specificDateSchedule,
    consultationDuration,
    bufferTime,
    availabilityMode,
    maxAppointmentsPerDay,
    emergencyAvailable,
    emergencyContactNumber
  } = req.body;

  // Validate required fields based on schedule type
  if (scheduleType === 'weekly' && (!weeklySchedule || weeklySchedule.length === 0)) {
    throw new ApiError(400, "Weekly schedule is required for weekly schedule type");
  }

  if (scheduleType === 'specific_date' && (!specificDate || !specificDateSchedule)) {
    throw new ApiError(400, "Specific date and schedule are required for specific date schedule type");
  }

  // Check if doctor already has an active schedule
  const existingSchedule = await Schedule.findOne({ 
    doctorId: req.doctor._id, 
    isActive: true,
    scheduleType: scheduleType
  });

  if (existingSchedule) {
    throw new ApiError(400, "Doctor already has an active schedule of this type");
  }

  const scheduleData = {
    doctorId: req.doctor._id,
    scheduleType,
    consultationDuration: consultationDuration || 30,
    bufferTime: bufferTime || 5,
    availabilityMode: availabilityMode || 'both',
    maxAppointmentsPerDay: maxAppointmentsPerDay || 20,
    emergencyAvailable: emergencyAvailable || false
  };

  if (scheduleType === 'weekly') {
    scheduleData.weeklySchedule = weeklySchedule;
  } else {
    scheduleData.specificDate = specificDate;
    scheduleData.specificDateSchedule = specificDateSchedule;
  }

  if (emergencyAvailable && emergencyContactNumber) {
    scheduleData.emergencyContactNumber = emergencyContactNumber;
  }

  const schedule = await Schedule.create(scheduleData);
  
  return res.status(201).json(
    new ApiResponse(201, schedule, "Schedule created successfully")
  );
});

// Get doctor's schedule
const getDoctorSchedule = asyncHandler(async (req, res) => {
  const { scheduleType, date } = req.query;
  
  let query = { 
    doctorId: req.doctor._id, 
    isActive: true 
  };

  if (scheduleType) {
    query.scheduleType = scheduleType;
  }

  if (date && scheduleType === 'specific_date') {
    query.specificDate = {
      $gte: new Date(date),
      $lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)
    };
  }

  const schedules = await Schedule.find(query)
    .populate('weeklySchedule.timeSlots.appointmentId')
    .populate('weeklySchedule.timeSlots.patientId')
    .populate('specificDateSchedule.timeSlots.appointmentId')
    .populate('specificDateSchedule.timeSlots.patientId');

  return res.status(200).json(
    new ApiResponse(200, schedules, "Schedule retrieved successfully")
  );
});

// Update doctor's schedule
const updateSchedule = asyncHandler(async (req, res) => {
  const { scheduleId } = req.params;
  const updateData = req.body;

  const schedule = await Schedule.findOne({ 
    _id: scheduleId, 
    doctorId: req.doctor._id 
  });

  if (!schedule) {
    throw new ApiError(404, "Schedule not found");
  }

  // Check if there are existing bookings before making major changes
  const hasBookings = schedule.scheduleType === 'weekly' 
    ? schedule.weeklySchedule.some(day => 
        day.timeSlots.some(slot => slot.isBooked)
      )
    : schedule.specificDateSchedule.timeSlots.some(slot => slot.isBooked);

  if (hasBookings && (updateData.weeklySchedule || updateData.specificDateSchedule)) {
    throw new ApiError(400, "Cannot modify schedule with existing bookings. Please cancel appointments first.");
  }

  Object.keys(updateData).forEach(key => {
    if (updateData[key] !== undefined) {
      schedule[key] = updateData[key];
    }
  });

  await schedule.save();

  return res.status(200).json(
    new ApiResponse(200, schedule, "Schedule updated successfully")
  );
});

// Delete/Deactivate schedule
const deleteSchedule = asyncHandler(async (req, res) => {
  const { scheduleId } = req.params;

  const schedule = await Schedule.findOne({ 
    _id: scheduleId, 
    doctorId: req.doctor._id 
  });

  if (!schedule) {
    throw new ApiError(404, "Schedule not found");
  }

  // Check for active bookings
  const hasActiveBookings = schedule.scheduleType === 'weekly' 
    ? schedule.weeklySchedule.some(day => 
        day.timeSlots.some(slot => slot.isBooked)
      )
    : schedule.specificDateSchedule.timeSlots.some(slot => slot.isBooked);

  if (hasActiveBookings) {
    throw new ApiError(400, "Cannot delete schedule with active bookings");
  }

  // Soft delete by marking as inactive
  schedule.isActive = false;
  await schedule.save();

  return res.status(200).json(
    new ApiResponse(200, {}, "Schedule deactivated successfully")
  );
});

// Generate time slots for a day
const generateTimeSlots = asyncHandler(async (req, res) => {
  const { startTime, endTime, duration } = req.body;

  if (!startTime || !endTime) {
    throw new ApiError(400, "Start time and end time are required");
  }

  // Create a temporary schedule instance to use the method
  const tempSchedule = new Schedule({
    doctorId: req.doctor._id,
    consultationDuration: duration || 30,
    bufferTime: 5
  });

  const timeSlots = tempSchedule.generateTimeSlots(startTime, endTime, duration);

  return res.status(200).json(
    new ApiResponse(200, timeSlots, "Time slots generated successfully")
  );
});

// Add holiday/leave
const addHoliday = asyncHandler(async (req, res) => {
  const { scheduleId } = req.params;
  const { date, reason, isRecurring } = req.body;

  if (!date || !reason) {
    throw new ApiError(400, "Date and reason are required");
  }

  const schedule = await Schedule.findOne({ 
    _id: scheduleId, 
    doctorId: req.doctor._id 
  });

  if (!schedule) {
    throw new ApiError(404, "Schedule not found");
  }

  schedule.holidays.push({
    date: new Date(date),
    reason,
    isRecurring: isRecurring || false
  });

  await schedule.save();

  return res.status(200).json(
    new ApiResponse(200, schedule.holidays, "Holiday added successfully")
  );
});

// Remove holiday/leave
const removeHoliday = asyncHandler(async (req, res) => {
  const { scheduleId, holidayId } = req.params;

  const schedule = await Schedule.findOne({ 
    _id: scheduleId, 
    doctorId: req.doctor._id 
  });

  if (!schedule) {
    throw new ApiError(404, "Schedule not found");
  }

  schedule.holidays = schedule.holidays.filter(
    holiday => holiday._id.toString() !== holidayId
  );

  await schedule.save();

  return res.status(200).json(
    new ApiResponse(200, {}, "Holiday removed successfully")
  );
});

// Add temporary schedule change
const addTemporaryChange = asyncHandler(async (req, res) => {
  const { scheduleId } = req.params;
  const { date, changeType, modifiedSchedule, expiresAt } = req.body;

  if (!date || !changeType || !expiresAt) {
    throw new ApiError(400, "Date, change type, and expiration date are required");
  }

  const schedule = await Schedule.findOne({ 
    _id: scheduleId, 
    doctorId: req.doctor._id 
  });

  if (!schedule) {
    throw new ApiError(404, "Schedule not found");
  }

  schedule.temporaryChanges.push({
    date: new Date(date),
    changeType,
    modifiedSchedule: modifiedSchedule || {},
    expiresAt: new Date(expiresAt)
  });

  await schedule.save();

  return res.status(200).json(
    new ApiResponse(200, schedule.temporaryChanges, "Temporary change added successfully")
  );
});

// Get available slots for a specific date
const getAvailableSlots = asyncHandler(async (req, res) => {
  const { date } = req.params;
  const { doctorId } = req.query;

  const targetDoctorId = doctorId || req.doctor._id;
  const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });

  // Find doctor's weekly schedule
  const weeklySchedule = await Schedule.findOne({
    doctorId: targetDoctorId,
    scheduleType: 'weekly',
    isActive: true
  });

  // Find specific date schedule
  const specificSchedule = await Schedule.findOne({
    doctorId: targetDoctorId,
    scheduleType: 'specific_date',
    specificDate: {
      $gte: new Date(date),
      $lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)
    },
    isActive: true
  });

  let availableSlots = [];

  // Check weekly schedule
  if (weeklySchedule) {
    const daySchedule = weeklySchedule.weeklySchedule.find(
      day => day.dayOfWeek === dayOfWeek
    );
    
    if (daySchedule && daySchedule.isAvailable) {
      const slots = daySchedule.timeSlots
        .filter(slot => !slot.isBooked)
        .map(slot => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
          scheduleType: 'weekly'
        }));
      
      availableSlots = availableSlots.concat(slots);
    }
  }

  // Check specific date schedule (overrides weekly)
  if (specificSchedule && specificSchedule.specificDateSchedule.isAvailable) {
    const slots = specificSchedule.specificDateSchedule.timeSlots
      .filter(slot => !slot.isBooked)
      .map(slot => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        scheduleType: 'specific_date'
      }));
    
    // If specific date schedule exists, use it instead of weekly
    availableSlots = slots;
  }

  // Filter out holiday dates
  const hasHoliday = (weeklySchedule?.holidays || []).concat(specificSchedule?.holidays || [])
    .some(holiday => {
      const holidayDate = new Date(holiday.date).toDateString();
      const checkDate = new Date(date).toDateString();
      return holidayDate === checkDate;
    });

  if (hasHoliday) {
    availableSlots = [];
  }

  return res.status(200).json(
    new ApiResponse(200, { date, availableSlots }, "Available slots retrieved successfully")
  );
});

// Get schedule analytics
const getScheduleAnalytics = asyncHandler(async (req, res) => {
  const { scheduleId } = req.params;
  const { startDate, endDate } = req.query;

  const schedule = await Schedule.findOne({ 
    _id: scheduleId, 
    doctorId: req.doctor._id 
  });

  if (!schedule) {
    throw new ApiError(404, "Schedule not found");
  }

  // Calculate analytics
  const analytics = {
    totalSlots: schedule.scheduleType === 'weekly' 
      ? schedule.weeklySchedule.reduce((total, day) => total + day.timeSlots.length, 0)
      : schedule.specificDateSchedule.timeSlots.length,
    
    bookedSlots: schedule.scheduleType === 'weekly'
      ? schedule.weeklySchedule.reduce((total, day) => 
          total + day.timeSlots.filter(slot => slot.isBooked).length, 0)
      : schedule.specificDateSchedule.timeSlots.filter(slot => slot.isBooked).length,
    
    utilizationRate: 0,
    stats: schedule.stats
  };

  analytics.utilizationRate = analytics.totalSlots > 0 
    ? (analytics.bookedSlots / analytics.totalSlots * 100).toFixed(2)
    : 0;

  return res.status(200).json(
    new ApiResponse(200, analytics, "Schedule analytics retrieved successfully")
  );
});

export {
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
};