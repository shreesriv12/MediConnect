import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const clientSchema = new mongoose.Schema({
    id: {
      type: String,
      required: true,
      unique: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true
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
    password: {
      type: String,
      required: true
    },
    avatar: {
      type: String,
      default: ''
    }
  }, { timestamps: true });

  clientSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
    next();
  });

  
  clientSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
  };

  clientSchema.methods.generateAccessToken = function () {
    return jwt.sign(
      {
        _id: this._id,
        email: this.email,
        name: this.name
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
      }
    );
  };
  
  clientSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
      {
        _id: this._id
      },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY
      }
    );
  };
  
  const Client = mongoose.model('Client', clientSchema);
export default Client;
