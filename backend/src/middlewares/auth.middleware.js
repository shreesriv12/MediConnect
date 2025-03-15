import jwt from "jsonwebtoken";
import Doctor from "../models/doctor.models.js";
import { ApiError } from "../utils/ApiError.js";

export const isAuthenticated = async (req, res, next) => {
  const token = req.cookies.accessToken || req.header("Authorization")?.replace("Bearer ", "");
  if (!token) throw new ApiError(401, "Unauthorized access");

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.doctor = await Doctor.findById(decoded._id).select("-password -refreshToken");
    if (!req.doctor) throw new ApiError(401, "Doctor not found");
    next();
  } catch (err) {
    throw new ApiError(401, "Invalid or expired token");
  }
};
