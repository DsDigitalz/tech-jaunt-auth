const User = require("../models/user.models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      otp,
      otpExpiry,
      isVerified: false,
    });

    await newUser.save();

    return res.status(201).json({
      message: "User created successfully. Verify OTP.",
      otp, // ⚠️ REMOVE IN PRODUCTION
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
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        message: "Account not verified. Please verify OTP.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user._id, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
    });
  } catch (e) {
    console.error("Login error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * =========================
 * FORGOT PASSWORD (OTP)
 * =========================
 */
const forgetPassword = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.otp = otp;
    user.otpExpiry = otpExpiry;

    await user.save();

    return res.status(200).json({
      message: "OTP sent successfully",
      otp, // ⚠️ REMOVE IN PRODUCTION
    });
  } catch (e) {
    console.error("Forget password error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * =========================
 * RESET PASSWORD (WITH OTP EXPIRY CHECK)
 * =========================
 */
const resetPassword = async (req, res) => {
  const { otp, newPassword } = req.body;

  try {
    if (!otp || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ otp });
    if (!user) {
      return res.status(404).json({ message: "Invalid OTP" });
    }

    // ✅ OTP EXPIRY CHECK
    if (!user.otpExpiry || user.otpExpiry < new Date()) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.otp = null;
    user.otpExpiry = null;

    await user.save();

    return res.status(200).json({ message: "Password reset successful" });
  } catch (e) {
    console.error("Reset password error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * =========================
 * VERIFY OTP (ACCOUNT)
 * =========================
 */
const verifyOtp = async (req, res) => {
  const { otp } = req.body;

  try {
    if (!otp) {
      return res.status(400).json({ message: "OTP is required" });
    }

    const user = await User.findOne({ otp });
    if (!user) {
      return res.status(404).json({ message: "Invalid OTP" });
    }

    if (!user.otpExpiry || user.otpExpiry < new Date()) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;

    await user.save();

    return res.status(200).json({ message: "User verified successfully" });
  } catch (e) {
    console.error("Verify OTP error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * =========================
 * RESEND OTP
 * =========================
 */
const resendOtp = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.otp = otp;
    user.otpExpiry = otpExpiry;

    await user.save();

    return res.status(200).json({
      message: "OTP resent successfully",
      otp, // ⚠️ REMOVE IN PRODUCTION
    });
  } catch (e) {
    console.error("Resend OTP error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * =========================
 * GET ALL USERS (ADMIN)
 * =========================
 */
const getAllUsers = async (req, res) => {
  const { userId } = req.user;

  try {
    const adminUser = await User.findById(userId);
    if (adminUser.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const users = await User.find().select("-password -otp -otpExpiry");
    return res.status(200).json(users);
  } catch (e) {
    console.error("Get users error:", e);
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
};
