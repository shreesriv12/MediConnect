import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Doctor from "../models/doctor.models.js";
import { uploadToCloud } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "Gmail",
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
    throw new ApiError(500, "Error generating tokens");
  }
};

const registerDoctor = asyncHandler(async (req, res) => {
  const { name, email, password, specialization, experience, degree, age, gender } = req.body;

  if ([name, email, password, specialization, experience, degree, age, gender].some((field) => !field?.trim())) {
    throw new ApiError(400, "All fields are required");
  }

  const existingDoctor = await Doctor.findOne({ email });
  if (existingDoctor) throw new ApiError(409, "Doctor already exists");

  const localPath = req.file?.path;
  console.log("Received file:", req.file);
  if (!localPath) throw new ApiError(400, "Avatar file is required");
  
  const avatar = await uploadToCloud(localPath);
  if (!avatar) throw new ApiError(400, "Avatar upload failed");

  const hashedPassword = await bcrypt.hash(password, 10);

  const doctor = await Doctor.create({
    name,
    email,
    password: hashedPassword,
    specialization,
    experience,
    degree,
    age,
    gender,
    avatar: avatar.url,
    verified: false,
  });

  const verificationToken = jwt.sign({ email }, process.env.EMAIL_VERIFICATION_SECRET, { expiresIn: "1d" });
  const verificationLink = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Email Verification",
    html: `<p>Click the link to verify your email:</p><a href="${verificationLink}">Verify Email</a>`
  });

  res.status(201).json(new ApiResponse(201, {}, "Doctor registered. Verify email."));
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;
  const decoded = jwt.verify(token, process.env.EMAIL_VERIFICATION_SECRET);
  
  const doctor = await Doctor.findOne({ email: decoded.email });
  if (!doctor) throw new ApiError(404, "Doctor not found");

  doctor.verified = true;
  await doctor.save();

  res.status(200).json(new ApiResponse(200, {}, "Email verified successfully"));
});

const loginDoctor = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  const doctor = await Doctor.findOne({ email });
  if (!doctor) throw new ApiError(404, "Doctor not found");
  if (!doctor.verified) throw new ApiError(400, "Verify your email before logging in");

  const isMatch = await bcrypt.compare(password, doctor.password);
  if (!isMatch) throw new ApiError(400, "Invalid credentials");

  const { accessToken, refreshToken } = await generateAccessRefreshTokens(doctor._id);

  res.status(200).json(new ApiResponse(200, { accessToken, refreshToken }, "Login successful"));
});

const logoutDoctor = asyncHandler(async (req, res) => {
  await Doctor.findByIdAndUpdate(req.user.id, { $unset: { refreshToken: 1 } });
  res.status(200).json(new ApiResponse(200, {}, "Logout successful"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingToken) throw new ApiError(401, "Unauthorized request");

  const decodedToken = jwt.verify(incomingToken, process.env.REFRESH_TOKEN_SECRET);
  const doctor = await Doctor.findById(decodedToken.id);
  if (!doctor || incomingToken !== doctor.refreshToken) throw new ApiError(401, "Invalid refresh token");

  const { accessToken, refreshToken } = await generateAccessRefreshTokens(doctor._id);
  res.status(200).json(new ApiResponse(200, { accessToken, refreshToken }, "Token refreshed"));
});

const getDoctorProfile = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.user.id).select("-password");
  if (!doctor) throw new ApiError(404, "Doctor not found");
  res.status(200).json(new ApiResponse(200, doctor, "Doctor profile retrieved"));
});

export { registerDoctor, verifyEmail, loginDoctor, logoutDoctor, refreshAccessToken, getDoctorProfile };
