import jwt from "jsonwebtoken";
import Doctor from "../models/doctor.models.js";
import Client from "../models/client.model.js";
import { ApiError } from "../utils/ApiError.js";

export const isAuthenticated = async (req, res, next) => {
  try {
    // Check for token in cookies first, then in Authorization header
    const token = req.cookies?.accessToken || 
                 (req.headers.authorization?.startsWith('Bearer ') ?
                  req.headers.authorization.split(' ')[1] : null);
    
    console.log("Authentication middleware - Token received:", token ? "Token present" : "No token");
    
    if (!token) {
      return next(new ApiError(401, "Unauthorized: No token provided"));
    }
    
    // Verify the token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
    // Check if user exists in either Doctor or Client collection
    let user = await Doctor.findById(decoded._id).select("-password -refreshToken");
    
    if (!user) {
      user = await Client.findById(decoded._id).select("-password -refreshToken");
      if (!user) return next(new ApiError(401, "Unauthorized: User not found"));
      
      // Attach client to request
      req.client = user;
      req.userType = "client";
    } else {
      // Attach doctor to request
      req.doctor = user;
      req.userType = "doctor";
    }
    
    next();
  } catch (err) {
    console.error("Authentication error:", err.message);
    return next(new ApiError(401, "Unauthorized: Invalid or expired token"));
  }
};