import Doctor from "../models/doctor.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { uploadToCloud } from "../utils/cloudinary.js";
import { sendOtp } from "../utils/sendotp.js";
import AppointmentSlot from "../models/appointmentSlot.model.js";
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const generateAccessRefreshTokens = async (doctorId) => {
  try {
    const doctor = await Doctor.findById(doctorId);
    const accessToken = doctor.generateAccessToken();
    const refreshToken = doctor.generateRefreshToken();
    doctor.refreshToken = refreshToken;
    await doctor.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

const registerDoctor = asyncHandler(async (req, res) => {
  const { name, email, phone, password, specialization, experience, degree, age, gender } = req.body;

  if ([name, email, phone, password, specialization, experience, degree, age, gender].some((field) => !field?.trim())) {
    throw new ApiError(400, "All fields are required");
  }

  const existingDoctor = await Doctor.findOne({ $or: [{ email }, { phone }] });
  if (existingDoctor) throw new ApiError(400, "Email or phone number already exists");
  
  if (!req.file?.path) throw new ApiError(400, "Avatar file is required");
  const avatar = await uploadToCloud(req.file.path);
  if (!avatar) throw new ApiError(500, "Avatar upload failed");

  const otp = generateOTP();
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

  const emailSent = await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP for Email Verification",
    html: `<p>Your OTP is: <strong>${otp}</strong></p><p>This OTP is valid for 5 minutes.</p>`,
  });
  if (!emailSent) throw new ApiError(500, "Failed to send email OTP");

  const doctor = await Doctor.create({
    name,
    email,
    phone,
    password,
    specialization,
    experience,
    degree,
    age,
    gender,
    avatar: avatar.url,
    verified: false,
    otp,
    otpExpires,
  });

  const userFromDB = await Doctor.findById(doctor._id).select("-password -refreshToken");

  return res.status(201).json(new ApiResponse(200, userFromDB, "Doctor Registered Successfully! Please verify your email."));
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) throw new ApiError(400, "Email and OTP are required");

  const doctor = await Doctor.findOne({ email });
  if (!doctor) throw new ApiError(400, "Doctor not found");

  if (doctor.otp !== otp || doctor.otpExpires < new Date()) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  doctor.verified = true;
  doctor.otp = undefined;
  doctor.otpExpires = undefined;
  await doctor.save();

  res.status(200).json(new ApiResponse(200, { message: "Email verified successfully" }));
});

const loginDoctor = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const doctor = await Doctor.findOne({ email });
  if (!doctor) {
    throw new ApiError(404, "requested User doesn't even exist");
  }

   // Check if password is correct
   const valid = await doctor.isPasswordCorrect(password);
   if (!valid) {
     throw new ApiError(401, "Invalid user credentials");
   }
  if (!doctor.verified) throw new ApiError(401, "Please verify your email first");

  // Generate Access and Refresh Tokens
  const { accessToken, refreshToken } = await generateAccessRefreshTokens(
    doctor._id
  );

  // Send Access and Refresh Tokens as Cookies
  const loggedUserFromDB = await Doctor.findById(doctor._id).select(
    "-password -refreshToken"
  );

  const cookieOptions = {
    httpOnly: true,
    secure: true,
  };

  // Return Logged In User and Tokens
  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          doctor: loggedUserFromDB,
          accessToken,
          refreshToken,
        },
        "Doctor logged In Successfully"
      )
    );
});

const logoutDoctor = asyncHandler(async (req, res) => {
  await Doctor.findByIdAndUpdate(req.doctor._id, { $unset: { refreshToken: 1 } }, { new: true });
  const cookieOptions = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "Doctor logged Out successfuly"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingToken = req.cookies.refreshToken || req.body.refreshToken;
 
 
  if (!incomingToken) 
  throw new ApiError(401, "Unauthorized Request");

  const decodedToken = jwt.verify(
    incomingToken,
     process.env.REFRESH_TOKEN_SECRET
    );


  const doctor = await Doctor.findById(decodedToken._id);
  if (!doctor || incomingToken !== doctor.refreshToken) 
    throw new ApiError(401, "Invalid or expired refresh token");

  const cookieOptions = {
    httpOnly: true,
    secure: true,
  };

  const { accessToken, newRefreshToken } = await generateAccessRefreshTokens(
    doctor._id
  );

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", newRefreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken: newRefreshToken },
        "Token Refreshed"
      )
    );
});

// Get Current user data lol
const getCurrentDoctor = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.doctor, "Current User Data"));
});


const updateDoctor = asyncHandler(async (req, res) => {
  const { name, email, phone, password, specialization, experience, degree, age, gender } = req.body;
  
  const doctor = await Doctor.findById(req.doctor._id);
  if (!doctor) throw new ApiError(404, "Doctor not found");

  // Check for existing email or phone if updated
  if ((email && email !== doctor.email) || (phone && phone !== doctor.phone)) {
    const existingDoctor = await Doctor.findOne({
      $or: [{ email }, { phone }],
      _id: { $ne: doctor._id },
    });

    if (existingDoctor) throw new ApiError(400, "Email or phone already in use");
  }

  if (name) doctor.name = name;
  if (email) doctor.email = email;
  if (phone) doctor.phone = phone;
  if (specialization) doctor.specialization = specialization;
  if (experience) doctor.experience = experience;
  if (degree) doctor.degree = degree;
  if (age) doctor.age = age;
  if (gender) doctor.gender = gender;

  if (password) {
    doctor.password = await bcrypt.hash(password, 10);
  }

  if (req.file?.path) {
    const avatar = await uploadToCloud(req.file.path);
    if (!avatar) throw new ApiError(500, "Avatar upload failed");
    doctor.avatar = avatar.url;
  }

  await doctor.save();
  const updatedDoctor = await Doctor.findById(doctor._id).select("-password -refreshToken");

  return res.status(200).json(new ApiResponse(200, updatedDoctor, "Doctor updated successfully"));
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { doctorId, otp } = req.body;

  if (!doctorId || !otp) throw new ApiError(400, "Doctor ID and OTP are required");

  const doctor = await Doctor.findById(doctorId);
  if (!doctor) throw new ApiError(404, "Doctor not found");

  if (doctor.otp !== otp || doctor.otpExpires < Date.now()) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  // OTP verified, mark doctor as verified
  doctor.verified = true;
  doctor.otp = null;
  doctor.otpExpires = null;
  await doctor.save();

  // Generate authentication tokens
  const accessToken = jwt.sign({ _id: doctor._id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY });
  const refreshToken = jwt.sign({ _id: doctor._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRY});

  // Set secure cookies
  const cookieOptions = { httpOnly: true, secure: true };

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(new ApiResponse(200, { doctorId: doctor._id, message: "OTP verified successfully!" }));
});


// Create Appointment Slot
const createAppointmentSlot = asyncHandler(async (req, res) => {
  const { date, startTime, endTime, duration, fee } = req.body;
  
  // Create appointment slot
  const slot = await AppointmentSlot.create({
    doctorId: req.doctor._id,
    date: new Date(date),
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    duration: duration || 30, // default 30 minutes
    fee: fee || req.doctor.fee // use doctor's default fee if not provided
  });
  
  return res
    .status(201)
    .json(new ApiResponse(201, slot, "Appointment slot created successfully"));
});

// Get Doctor's Appointment Slots
const getDoctorSlots = asyncHandler(async (req, res) => {
  const slots = await AppointmentSlot.find({ doctorId: req.doctor._id });
  
  return res
    .status(200)
    .json(new ApiResponse(200, { count: slots.length, slots }, "Doctor slots retrieved successfully"));
});

// Update Appointment Slot
const updateAppointmentSlot = asyncHandler(async (req, res) => {
  const { date, startTime, endTime, duration, fee } = req.body;
  
  const slot = await AppointmentSlot.findOneAndUpdate(
    { _id: req.params.id, doctorId: req.doctor._id, isBooked: false },
    { date: new Date(date), startTime: new Date(startTime), endTime: new Date(endTime), duration, fee },
    { new: true, runValidators: true }
  );
  
  if (!slot) {
    throw new ApiError(404, "Slot not found or cannot be updated because it is already booked");
  }
  
  return res
    .status(200)
    .json(new ApiResponse(200, slot, "Appointment slot updated successfully"));
});

// Delete Appointment Slot
const deleteAppointmentSlot = asyncHandler(async (req, res) => {
  const slot = await AppointmentSlot.findOneAndDelete({
    _id: req.params.id,
    doctorId: req.doctor._id,
    isBooked: false
  });
  
  if (!slot) {
    throw new ApiError(404, "Slot not found or cannot be deleted because it is already booked");
  }
  
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Appointment slot deleted successfully"));
});

// Get Doctor's Appointments
const getDoctorAppointments = asyncHandler(async (req, res) => {
  const { status } = req.query;
  
  const query = { doctorId: req.doctor._id };
  if (status) {
    query.status = status;
  }
  
  const appointments = await Appointment.find(query)
    .populate('clientId', 'name email phone')
    .populate('slotId');
  
  return res
    .status(200)
    .json(new ApiResponse(200, { count: appointments.length, appointments }, "Doctor appointments retrieved successfully"));
});

// Update Appointment Status
const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  
  if (!['confirmed', 'cancelled', 'completed'].includes(status)) {
    throw new ApiError(400, "Invalid status");
  }
  
  const appointment = await Appointment.findOneAndUpdate(
    { _id: req.params.id, doctorId: req.doctor._id },
    { status },
    { new: true, runValidators: true }
  );
  
  if (!appointment) {
    throw new ApiError(404, "Appointment not found");
  }
  
  return res
    .status(200)
    .json(new ApiResponse(200, appointment, "Appointment status updated successfully"));
});

export { 
  registerDoctor, 
  loginDoctor, 
  verifyOtp, 
  verifyEmail, 
  logoutDoctor, 
  refreshAccessToken,
  getCurrentDoctor,
  updateDoctor,
  // New exported functions for appointment management
  createAppointmentSlot,
  getDoctorSlots,
  updateAppointmentSlot,
  deleteAppointmentSlot,
  getDoctorAppointments,
  updateAppointmentStatus
};