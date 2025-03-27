import jwt from "jsonwebtoken";
import Doctor from "../models/doctor.models.js";
import { ApiError } from "../utils/ApiError.js";
import Client from "../models/client.model.js";
export const isAuthenticated = async (req, res, next) => {
  const token = req.cookies.accessToken || req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return next(new ApiError(401, "Unauthorized: No token provided"));
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    let user = await Doctor.findById(decoded._id).select("-password -refreshToken");

    if (!user) {
      user = await Client.findById(decoded._id).select("-password -refreshToken");
      if (!user) return next(new ApiError(401, "Unauthorized: User not found"));
      req.client = user;
    } else {
      req.doctor = user;
    }

    next();
  } catch (err) {
    console.error("Token verification error:", err.message);
    next(new ApiError(401, "Unauthorized: Invalid or expired token"));
  }
};

