import mongoose from "mongoose";

const timeSlotSchema = new mongoose.Schema({
  startTime: {
    type: String,
    required: true,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Please enter time in HH:MM format"]
  },
  endTime: {
    type: String,
    required: true,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Please enter time in HH:MM format"]
  },
  isBooked: {
    type: Boolean,
    default: false
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Appointment",
    default: null
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    default: null
  }
});

const dailyScheduleSchema = new mongoose.Schema({
  dayOfWeek: {
    type: String,
    enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    required: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  timeSlots: [timeSlotSchema],
  breakTimes: [{
    startTime: {
      type: String,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Please enter time in HH:MM format"]
    },
    endTime: {
      type: String,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Please enter time in HH:MM format"]
    },
    reason: {
      type: String,
      default: "Break"
    }
  }]
});

const scheduleSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true
    },
    scheduleType: {
      type: String,
      enum: ["weekly", "specific_date"],
      default: "weekly"
    },
    // For weekly recurring schedules
    weeklySchedule: [dailyScheduleSchema],
    
    // For specific date schedules
    specificDate: {
      type: Date,
      index: true
    },
    specificDateSchedule: {
      isAvailable: {
        type: Boolean,
        default: true
      },
      timeSlots: [timeSlotSchema],
      breakTimes: [{
        startTime: String,
        endTime: String,
        reason: String
      }]
    },
    
    // Consultation settings
    consultationDuration: {
      type: Number,
      default: 30, // Duration in minutes
      min: 15,
      max: 120
    },
    
    bufferTime: {
      type: Number,
      default: 5, // Buffer time between appointments in minutes
      min: 0,
      max: 30
    },
    
    // Online/Offline availability
    availabilityMode: {
      type: String,
      enum: ["online", "offline", "both"],
      default: "both"
    },
    
    // Maximum appointments per day
    maxAppointmentsPerDay: {
      type: Number,
      default: 20,
      min: 1,
      max: 50
    },
    
    // Emergency availability
    emergencyAvailable: {
      type: Boolean,
      default: false
    },
    
    emergencyContactNumber: {
      type: String,
      match: [/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number"]
    },
    
    // Holiday/Leave management
    holidays: [{
      date: {
        type: Date,
        required: true
      },
      reason: {
        type: String,
        required: true
      },
      isRecurring: {
        type: Boolean,
        default: false
      }
    }],
    
    // Temporary schedule changes
    temporaryChanges: [{
      date: {
        type: Date,
        required: true
      },
      changeType: {
        type: String,
        enum: ["unavailable", "modified_hours", "emergency_only"],
        required: true
      },
      modifiedSchedule: {
        timeSlots: [timeSlotSchema],
        reason: String
      },
      expiresAt: {
        type: Date,
        required: true
      }
    }],
    
    // Schedule status
    isActive: {
      type: Boolean,
      default: true
    },
    
    // Notification preferences
    notificationSettings: {
      appointmentReminders: {
        type: Boolean,
        default: true
      },
      scheduleChanges: {
        type: Boolean,
        default: true
      },
      emergencyAlerts: {
        type: Boolean,
        default: true
      }
    },
    
    // Analytics
    stats: {
      totalAppointments: {
        type: Number,
        default: 0
      },
      completedAppointments: {
        type: Number,
        default: 0
      },
      cancelledAppointments: {
        type: Number,
        default: 0
      },
      noShowAppointments: {
        type: Number,
        default: 0
      }
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better performance
scheduleSchema.index({ doctorId: 1, scheduleType: 1 });
scheduleSchema.index({ doctorId: 1, specificDate: 1 });
scheduleSchema.index({ "weeklySchedule.dayOfWeek": 1 });
scheduleSchema.index({ isActive: 1 });

// Virtual for getting available slots
scheduleSchema.virtual('availableSlots').get(function() {
  if (this.scheduleType === 'weekly') {
    return this.weeklySchedule.reduce((total, day) => {
      return total + day.timeSlots.filter(slot => !slot.isBooked).length;
    }, 0);
  } else {
    return this.specificDateSchedule.timeSlots.filter(slot => !slot.isBooked).length;
  }
});

// Method to check if doctor is available on a specific date and time
scheduleSchema.methods.isAvailable = function(date, time) {
  const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
  
  // Check for holidays
  const isHoliday = this.holidays.some(holiday => {
    const holidayDate = new Date(holiday.date).toDateString();
    const checkDate = new Date(date).toDateString();
    return holidayDate === checkDate;
  });
  
  if (isHoliday) return false;
  
  // Check temporary changes
  const tempChange = this.temporaryChanges.find(change => {
    const changeDate = new Date(change.date).toDateString();
    const checkDate = new Date(date).toDateString();
    return changeDate === checkDate && new Date() < change.expiresAt;
  });
  
  if (tempChange && tempChange.changeType === 'unavailable') return false;
  
  // Check weekly schedule
  if (this.scheduleType === 'weekly') {
    const daySchedule = this.weeklySchedule.find(day => day.dayOfWeek === dayOfWeek);
    if (!daySchedule || !daySchedule.isAvailable) return false;
    
    return daySchedule.timeSlots.some(slot => 
      slot.startTime <= time && slot.endTime > time && !slot.isBooked
    );
  }
  
  // Check specific date schedule
  if (this.scheduleType === 'specific_date') {
    const scheduleDate = new Date(this.specificDate).toDateString();
    const checkDate = new Date(date).toDateString();
    
    if (scheduleDate !== checkDate) return false;
    if (!this.specificDateSchedule.isAvailable) return false;
    
    return this.specificDateSchedule.timeSlots.some(slot => 
      slot.startTime <= time && slot.endTime > time && !slot.isBooked
    );
  }
  
  return false;
};

// Method to book a time slot
scheduleSchema.methods.bookSlot = async function(date, time, appointmentId, patientId) {
  const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
  
  if (this.scheduleType === 'weekly') {
    const daySchedule = this.weeklySchedule.find(day => day.dayOfWeek === dayOfWeek);
    if (daySchedule) {
      const slot = daySchedule.timeSlots.find(slot => 
        slot.startTime <= time && slot.endTime > time && !slot.isBooked
      );
      
      if (slot) {
        slot.isBooked = true;
        slot.appointmentId = appointmentId;
        slot.patientId = patientId;
        this.stats.totalAppointments += 1;
        await this.save();
        return true;
      }
    }
  } else if (this.scheduleType === 'specific_date') {
    const slot = this.specificDateSchedule.timeSlots.find(slot => 
      slot.startTime <= time && slot.endTime > time && !slot.isBooked
    );
    
    if (slot) {
      slot.isBooked = true;
      slot.appointmentId = appointmentId;
      slot.patientId = patientId;
      this.stats.totalAppointments += 1;
      await this.save();
      return true;
    }
  }
  
  return false;
};

// Method to cancel a booking
scheduleSchema.methods.cancelSlot = async function(appointmentId) {
  let slotFound = false;
  
  if (this.scheduleType === 'weekly') {
    this.weeklySchedule.forEach(day => {
      const slot = day.timeSlots.find(slot => 
        slot.appointmentId && slot.appointmentId.toString() === appointmentId.toString()
      );
      
      if (slot) {
        slot.isBooked = false;
        slot.appointmentId = null;
        slot.patientId = null;
        slotFound = true;
      }
    });
  } else if (this.scheduleType === 'specific_date') {
    const slot = this.specificDateSchedule.timeSlots.find(slot => 
      slot.appointmentId && slot.appointmentId.toString() === appointmentId.toString()
    );
    
    if (slot) {
      slot.isBooked = false;
      slot.appointmentId = null;
      slot.patientId = null;
      slotFound = true;
    }
  }
  
  if (slotFound) {
    this.stats.cancelledAppointments += 1;
    await this.save();
    return true;
  }
  
  return false;
};

// Method to generate time slots automatically
scheduleSchema.methods.generateTimeSlots = function(startTime, endTime, duration = null) {
  const slots = [];
  const slotDuration = duration || this.consultationDuration;
  const buffer = this.bufferTime;
  
  let current = this.parseTime(startTime);
  const end = this.parseTime(endTime);
  
  while (current + slotDuration <= end) {
    const slotStart = this.formatTime(current);
    const slotEnd = this.formatTime(current + slotDuration);
    
    slots.push({
      startTime: slotStart,
      endTime: slotEnd,
      isBooked: false,
      appointmentId: null,
      patientId: null
    });
    
    current += slotDuration + buffer;
  }
  
  return slots;
};

// Helper method to parse time string to minutes
scheduleSchema.methods.parseTime = function(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper method to format minutes to time string
scheduleSchema.methods.formatTime = function(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Pre-save middleware to validate time slots
scheduleSchema.pre('save', function(next) {
  // Validate that end times are after start times
  const validateTimeSlots = (slots) => {
    return slots.every(slot => {
      const start = this.parseTime(slot.startTime);
      const end = this.parseTime(slot.endTime);
      return end > start;
    });
  };
  
  if (this.scheduleType === 'weekly') {
    const allSlotsValid = this.weeklySchedule.every(day => 
      validateTimeSlots(day.timeSlots)
    );
    if (!allSlotsValid) {
      return next(new Error('Invalid time slots: end time must be after start time'));
    }
  } else if (this.scheduleType === 'specific_date') {
    if (!validateTimeSlots(this.specificDateSchedule.timeSlots)) {
      return next(new Error('Invalid time slots: end time must be after start time'));
    }
  }
  
  next();
});

const Schedule = mongoose.models.Schedule || mongoose.model("Schedule", scheduleSchema);
export default Schedule;