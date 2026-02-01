// controllers/user.controller.js

const User = require("../models/user.models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/email");
const cloudinary = require("../config/cloudinary");

/**
 * =========================
 * SIGN UP
 * =========================
 */
const signup = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      otp: hashedOtp,
      otpExpiry,
      isVerified: false,
    });

    await newUser.save();

    try {
      await sendEmail(email, "Verify your account", "signup", { name, otp });
    } catch (emailError) {
      console.error("Error sending OTP email:", emailError);
    }

    return res.status(201).json({
      message: "User created successfully. Verify OTP via email.",
      otp,
    });
  } catch (e) {
    console.error("Signup error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * =========================
 * LOGIN
 * =========================
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.isVerified) {
      return res
        .status(401)
        .json({ message: "Account not verified. Please verify OTP." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    try {
      await sendEmail(email, "Login Notification", "login", {
        name: user.name,
        email,
      });
    } catch (emailError) {
      console.error("Error sending login email:", emailError);
    }

    return res.status(200).json({ message: "Login successful", token });
  } catch (e) {
    console.error("Login error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * =========================
 * FORGOT PASSWORD (SEND OTP)
 * =========================
 */
const forgetPassword = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) return res.status(400).json({ message: "Email is required" });

    // 1. Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    // 2. Use findOneAndUpdate to bypass 'required' field validation (like phoneNumber)
    const user = await User.findOneAndUpdate(
      { email },
      { $set: { otp: hashedOtp, otpExpiry: otpExpiry } },
      { new: true, runValidators: false },
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    try {
      await sendEmail(email, "Password Reset OTP", "forgotPassword", {
        name: user.name,
        otp,
      });
    } catch (emailError) {
      console.error("Error sending OTP email:", emailError);
    }

    return res.status(200).json({ message: "OTP sent successfully" });
  } catch (e) {
    console.error("Forget password error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * =========================
 * RESET PASSWORD
 * =========================
 */
const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.otp || !user.otpExpiry || user.otpExpiry < new Date()) {
      return res.status(400).json({ message: "OTP expired or invalid" });
    }

    const isOtpValid = await bcrypt.compare(otp, user.otp);
    if (!isOtpValid) return res.status(400).json({ message: "Invalid OTP" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear OTP using findOneAndUpdate to avoid validation traps
    await User.findOneAndUpdate(
      { email },
      {
        $set: { password: hashedPassword, otp: null, otpExpiry: null },
      },
      { runValidators: false },
    );

    try {
      await sendEmail(email, "Password Reset Successful", "resetPassword", {
        name: user.name,
        email,
      });
    } catch (emailError) {
      console.error("Error sending reset confirmation email:", emailError);
    }

    return res.status(200).json({ message: "Password reset successful" });
  } catch (e) {
    console.error("Reset password error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * =========================
 * VERIFY ACCOUNT OTP
 * =========================
 */
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  try {
    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.otp || !user.otpExpiry || user.otpExpiry < new Date()) {
      return res.status(400).json({ message: "OTP expired or invalid" });
    }

    const isOtpValid = await bcrypt.compare(otp, user.otp);
    if (!isOtpValid) return res.status(400).json({ message: "Invalid OTP" });

    await User.findOneAndUpdate(
      { email },
      { $set: { isVerified: true, otp: null, otpExpiry: null } },
      { runValidators: false },
    );

    return res.status(200).json({ message: "User verified successfully" });
  } catch (e) {
    console.error("Verify OTP error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * =========================
 * RESEND OTP / GETTERS / UPLOADS
 * =========================
 */
const resendOtp = async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await User.findOneAndUpdate(
      { email },
      { $set: { otp: hashedOtp, otpExpiry: otpExpiry } },
      { runValidators: false },
    );

    try {
      await sendEmail(email, "Resend OTP", "signup", { name: user.name, otp });
    } catch (emailError) {
      console.error("Error sending OTP email:", emailError);
    }

    return res.status(200).json({ message: "OTP resent successfully" });
  } catch (e) {
    console.error("Resend OTP error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const adminUser = await User.findById(req.user.id);
    if (!adminUser || adminUser.role !== "admin")
      return res.status(403).json({ message: "Access denied" });

    const users = await User.find().select("-password -otp -otpExpiry");
    return res.status(200).json(users);
  } catch (e) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -otp -otpExpiry",
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.status(200).json(user);
  } catch (e) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      folder: "profile_pictures",
      public_id: `user_${req.user.id}_profile`,
    });

    await User.findByIdAndUpdate(req.user.id, {
      profilePicture: uploadResult.secure_url,
    });

    return res
      .status(200)
      .json({ message: "Profile picture uploaded successfully" });
  } catch (e) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  signup,
  login,
  forgetPassword,
  resetPassword,
  verifyOtp,
  resendOtp,
  getAllUsers,
  getMe,
  uploadProfilePicture,
};
