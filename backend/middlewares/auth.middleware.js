import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token = req.cookies.accessToken;
    if (!token) throw new ApiError(401, "Invalid Access");

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decoded?._id).select(
      "-password -refreshToken"
    );
    if (!user) {
      throw new ApiError(401, "Invalid Access");
    }
    // Set the user in the request object
    req.user = user;
    next();
  } catch (err) {
    throw new ApiError(401, err);
  }
});