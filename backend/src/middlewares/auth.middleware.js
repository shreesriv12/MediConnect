import jwt from "jsonwebtoken";
import Doctor from "../models/doctor.models.js";
import { ApiError } from "../utils/ApiError.js";
import Client from "../models/client.model.js";
export const isAuthenticated = async (req, res, next) => {
  const token = req.cookies.accessToken || req.header("Authorization")?.replace("Bearer ", "");
  if (!token) throw new ApiError(401, "Unauthorized access");

  try {
    
    // Decode the token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    let user = await Doctor.findById(decoded._id).select("-password -refreshToken");
    if (!user) {
      user = await Client.findById(decoded._id).select("-password -refreshToken");
      if (!user) throw new ApiError(401, "User not found");
      req.client = user; // Attach client info if found
    } else {
      req.doctor = user; // Attach doctor info if found
    }
    next();
  } catch (err) {
    throw new ApiError(401, "Invalid or expired token");
  }
};
