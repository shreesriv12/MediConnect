import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import Doctor from "../models/doctor.models.js";
import Client from "../models/client.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;
    if (!token) throw new ApiError(401, 'Access token missing');

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    if (!decoded || !decoded.userType || !decoded._id) {
      throw new ApiError(401, 'Invalid token payload');
    }

    let user;
    if (decoded.userType === 'Doctor') {
      user = await Doctor.findById(decoded._id).select('-password -refreshToken');
    } else if (decoded.userType === 'Client') {
      user = await Client.findById(decoded._id).select('-password -refreshToken');
    } else {
      throw new ApiError(401, 'Invalid user type');
    }

    if (!user) {
      throw new ApiError(401, 'User not found');
    }

    req.user = user;
    req.userType = decoded.userType;
    next();
  } catch (err) {
    next(new ApiError(401, 'Unauthorized access'));
  }
});