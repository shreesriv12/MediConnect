import Client from "../models/client.model.js";
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

const generateAccessRefreshTokens = async (clientId) => {
  try {
    const client = await Client.findById(clientId);
    const accessToken = client.generateAccessToken();
    const refreshToken = client.generateRefreshToken();

    client.refreshToken = refreshToken;
    await client.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiError(500, "Error generating tokens");
  }
};

const registerClient = asyncHandler(async (req, res) => {
  const { name, email, phone, password, age, gender } = req.body;

  if ([name, email, phone, password, age, gender].some((field) => !field?.trim())) {
    throw new ApiError(400, "All fields are required");
  }

  const existingClient = await Client.findOne({ $or: [{ email }, { phone }] });
  if (existingClient) throw new ApiError(400, "Email or phone already exists");

  const avatar = req.file?.path ? (await uploadToCloud(req.file.path)).url : "";
  const otp = generateOTP();
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
  const verificationToken = jwt.sign({ email }, process.env.EMAIL_SECRET, { expiresIn: "1d" });

  await sendOtp(phone, otp);
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Verify Your Email",
    html: `<p>Click <a href="${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}">here</a> to verify your email.</p>`
  });

  const client = await Client.create({ name, email, phone, password, age, gender, avatar, verified: false, verificationToken, otp, otpExpires });
  const { accessToken, refreshToken } = await generateAccessRefreshTokens(client._id);

  return res.status(201).cookie("accessToken", accessToken, { httpOnly: true, secure: true })
    .cookie("refreshToken", refreshToken, { httpOnly: true, secure: true })
    .json(new ApiResponse(200, client, "Client registered successfully!"));
});

const loginClient = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    console.log("Login attempt for email:", email); // Debugging Log
  
    const client = await Client.findOne({ email });
  
    console.log("Found client:", client); // Debugging Log
  
    if (!client) {
      throw new ApiError(404, "Requested user doesn't exist");
    }
  
    // Check if password is correct
    const valid = await client.isPasswordCorrect(password);
    if (!valid) {
      throw new ApiError(401, "Invalid client credentials");
    }
  
    if (!client.verified) throw new ApiError(401, "Please verify your email first");
  
    const { accessToken, refreshToken } = await generateAccessRefreshTokens(client._id);
  
    const loggedUserFromDB = await Client.findById(client._id).select(
      "-password -refreshToken"
    );
  
    const cookieOptions = {
      httpOnly: true,
      secure: true,
    };
  
    return res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", refreshToken, cookieOptions)
      .json(
        new ApiResponse(
          200,
          {
            client: loggedUserFromDB,
            accessToken,
            refreshToken,
          },
          "Client logged in successfully"
        )
      );
  });
  
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) throw new ApiError(400, "Token missing");
  const decoded = jwt.verify(token, process.env.EMAIL_SECRET);
  const client = await Client.findOneAndUpdate({ email: decoded.email }, { verified: true }, { new: true });
  if (!client) throw new ApiError(400, "Invalid token");
  res.status(200).json(new ApiResponse(200, "Email verified successfully"));
});

const logoutClient = asyncHandler(async (req, res) => {
  await Client.findByIdAndUpdate(req.client._id, { refreshToken: null });
  return res.status(200).clearCookie("accessToken").clearCookie("refreshToken").json(new ApiResponse(200, {}, "Client logged out successfully"));
});

const updateClient = asyncHandler(async (req, res) => {
  const { name, email, phone, password, age, gender } = req.body;
  const client = await Client.findById(req.client._id);
  if (!client) throw new ApiError(404, "Client not found");

  if (email !== client.email || phone !== client.phone) {
    const existingClient = await Client.findOne({ $or: [{ email }, { phone }], _id: { $ne: client._id } });
    if (existingClient) throw new ApiError(400, "Email or phone already in use");
  }

  if (password) client.password = await bcrypt.hash(password, 10);
  if (req.file?.path) client.avatar = (await uploadToCloud(req.file.path)).url;
  Object.assign(client, { name, email, phone, age, gender });

  await client.save();
  return res.status(200).json(new ApiResponse(200, client, "Client updated successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingToken) throw new ApiError(401, "Unauthorized request");

  const decodedToken = jwt.verify(incomingToken, process.env.REFRESH_TOKEN_SECRET);
  const client = await Client.findById(decodedToken._id);
  if (!client || incomingToken !== client.refreshToken) throw new ApiError(401, "Invalid or expired refresh token");

  const { accessToken, refreshToken } = await generateAccessRefreshTokens(client._id);
  return res.status(200).cookie("accessToken", accessToken, { httpOnly: true, secure: true })
    .cookie("refreshToken", refreshToken, { httpOnly: true, secure: true })
    .json(new ApiResponse(200, { accessToken, refreshToken }, "Token refreshed"));
});


const verifyOtp = asyncHandler(async (req, res) => {
  const { clientId, otp } = req.body;

  if (!clientId || !otp) throw new ApiError(400, "Client ID and OTP are required");

  const client = await Client.findById(clientId);
  if (!client) throw new ApiError(404, "Client not found");

  if (client.otp !== otp || client.otpExpires < Date.now()) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  // OTP verified, mark client as verified
  client.verified = true;
  client.otp = null;
  client.otpExpires = null;
  await client.save();

  // Generate authentication tokens
  const accessToken = jwt.sign({ _id: client._id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY });
  const refreshToken = jwt.sign({ _id: client._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRY});

  // Set secure cookies
  const cookieOptions = { httpOnly: true, secure: true };

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(new ApiResponse(200, { clientId: client._id, message: "OTP verified successfully!" }));
});

// Get Current user data lol
const getCurrentClient = asyncHandler(async (req, res) => {
    return res
      .status(200)
      .json(new ApiResponse(200, req.client, "Current Client Data"));
  });
  

export { registerClient, loginClient, verifyEmail, logoutClient, updateClient, refreshAccessToken,verifyOtp,getCurrentClient };
