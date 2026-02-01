const express = require("express");
const {
  signup,
  login,
  forgetPassword,
  resetPassword,
  verifyOtp,
  resendOtp,
  getAllUsers,
  getMe,
  uploadProfilePicture,
} = require("../controller/user.controller");

const isAuth = require("../config/auth");
const router = express.Router();
const upload = require("../config/multer");

// Auth
router.post("/signup", signup);
router.post("/login", login);

// OTP verification
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);

// Password reset
router.post("/forget-password", forgetPassword);
router.post("/reset-password", resetPassword);

// Admin
router.get("/get-all-users", isAuth, getAllUsers);

// Get current user
router.get("/me", isAuth, getMe);

// Upload profile picture
router.put(
  "/upload-profile-picture",
  isAuth,
  upload.single("profilePicture"),
  uploadProfilePicture,
);

module.exports = router;
