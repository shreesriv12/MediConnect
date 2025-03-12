import mongoose,{Schema} from 'mongoose';
import jwt from 'jsonwebtoken';
import bycrypt from 'bcryptjs';

const doctorSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    index: true,
    trim:true,
    required: true
  },
  email: {
    type: String,
    required: true,
    index: true,
    trim:true,
    unique: true
  },
  password: {
    type: String,
    required: [true, 'Please add a password']
  },
  specialization: {
    type: String,
    required: true
  },
  experience: {
    type: Number,
    required: true
  },
  degree: {
    type: String,
    required: true
  },
  age: {
    type: Number,
    required: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true
  },
  avatar: {
    type: String,
    required:true
  },
  refreshToken: {
    type: String,
    default: null
  }
}, { timestamps: true });


userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  return next();
});

doctorSchema.methods.generateAccessToken = function () {
  return jwt.sign({ 
    id: this._id,
    name: this.name,
    email: this.email,

   }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
  });
}

doctorSchema.methods.generateRefreshToken = function () {
  return jwt.sign({ id: this._id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
  });
}
module.exports = mongoose.model('Doctor', doctorSchema);
