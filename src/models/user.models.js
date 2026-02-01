const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    // created because of cloudinary upload
    profilePicture: {
      type: String,
      default: null,
    },
    // created for phone number verification
    phoneNumber: {
      type: String,
      required: false,
      unique: true,
      sparse: true, // Allows multiple users to have 'null' while keeping uniqueness for real numbers
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    password: {
      type: String,
      required: true,
    },
    otp: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otpExpiry: {
      type: Date,
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, versionKey: false },
);

const User = mongoose.model("User", userSchema);

module.exports = User;
