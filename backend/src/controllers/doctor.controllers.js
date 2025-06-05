import Doctor from "../models/doctor.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { uploadToCloud } from "../utils/cloudinary.js";
import { sendOtp } from "../utils/sendotp.js";
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
  try {
    const { name, email, phone, password, specialization, experience, degree, age, gender } = req.body;

    if ([name, email, phone, password, specialization, experience, degree, age, gender].some((field) => !field?.trim())) {
      throw new ApiError(400, "All fields are required");
    }

    const existingDoctor = await Doctor.findOne({ $or: [{ email }, { phone }] });
    if (existingDoctor) throw new ApiError(400, "Email or phone number already exists");

    if (!req.file) {
      throw new ApiError(400, "Avatar file is required");
    }

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
  } catch (error) {
    // You can log here if needed
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
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


const getAllDoctors = asyncHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      specialization,
      experience,
      gender,
      verified,
      search
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (specialization) {
      filter.specialization = { $regex: specialization, $options: 'i' };
    }
    
    if (experience) {
      filter.experience = { $gte: parseInt(experience) };
    }
    
    if (gender) {
      filter.gender = gender;
    }
    
    if (verified !== undefined) {
      filter.verified = verified === 'true';
    }
    
    // Search functionality (name, email, specialization)
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { specialization: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get total count for pagination info
    const totalDoctors = await Doctor.countDocuments(filter);
    
    // Fetch doctors with pagination and exclude sensitive fields
    const doctors = await Doctor.find(filter)
      .select('-password -refreshToken -otp -otpExpires')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Pagination metadata
    const totalPages = Math.ceil(totalDoctors / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    const paginationInfo = {
      currentPage: parseInt(page),
      totalPages,
      totalDoctors,
      limit: parseInt(limit),
      hasNextPage,
      hasPrevPage
    };

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          doctors,
          pagination: paginationInfo
        },
        `Found ${doctors.length} doctors`
      )
    );
  } catch (error) {
    throw new ApiError(500, "Error fetching doctors: " + error.message);
  }
});

const getDoctorById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError(400, "Invalid doctor ID format");
    }

    // Find doctor by ID and exclude sensitive fields
    const doctor = await Doctor.findById(id).select(
      '-password -refreshToken -otp -otpExpires'
    );

    if (!doctor) {
      throw new ApiError(404, "Doctor not found");
    }

    // Only return verified doctors for public access
    // If you want to allow access to unverified doctors for admin, add auth middleware
    if (!doctor.verified) {
      throw new ApiError(404, "Doctor profile not available");
    }

    return res.status(200).json(
      new ApiResponse(200, doctor, "Doctor details fetched successfully")
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "Error fetching doctor details: " + error.message);
  }
});

// Export the new functions along with existing ones
export { 
  registerDoctor, 
  loginDoctor, 
  verifyOtp, 
  verifyEmail, 
  logoutDoctor, 
  refreshAccessToken,
  getCurrentDoctor,
  updateDoctor,
  getAllDoctors,    // New function
  getDoctorById,    // New function
};