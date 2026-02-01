// const mongoose = require("mongoose");
// const User = require("../models/user.models");
// const UserWallet = require("../models/user.wallets");

// /**
//  * =========================
//  * CREATE WALLET
//  * =========================
// //  */
// const createWallet = async (req, res) => {
//   try {
//     // Extract user ID from authenticated user
//     const {id: userId } = req.user;

//     // Extract currency from request body (optional, defaults to NGN)
//     const { currency = "NGN" } = req.body;

//     // Validate user ID
//     if (!userId) {
//       return res.status(400).json({ message: "User ID is required" });
//     }

//     // Check if user exists in database
//     const existingUser = await User.findById(userId);
//     if (!existingUser) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Check if user already has a wallet
//     const existingWallet = await UserWallet.findOne({ userId });
//     if (existingWallet) {
//       return res
//         .status(409)
//         .json({ message: "Wallet already exists for this user" });
//     }

//     // Create new wallet with default balance of 0
//     const newWallet = new UserWallet({
//       userId: userId,
//       balance: 0,
//       currency: currency,
//     });

//     // Save wallet to database
//     await newWallet.save();

//     // Return success response
//     return res.status(201).json({
//       message: "Wallet created successfully",
//       wallet: {
//         id: newWallet._id,
//         userId: newWallet.userId,
//         balance: newWallet.balance,
//         currency: newWallet.currency,
//         createdAt: newWallet.createdAt,
//       },
//     });
//   } catch (error) {
//     // Log error for debugging
//     console.error("Create wallet error:", error);

//     // Return generic error response
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

/**
 * =========================
 * CREATE WALLET VIA PHONE NUMBER
 * =========================
 */

const User = require("../models/user.models");
const UserWallet = require("../models/user.wallets");

/**
 * =========================
 * CREATE WALLET
 * =========================
 */
const createWallet = async (req, res) => {
  try {
    // Note: req.user.id usually comes from your auth middleware
    const userId = req.user.id; 
    const { phoneNumber, currency } = req.body;

    // 1. Basic validation
    if (!phoneNumber || !currency) {
      return res.status(400).json({ 
        message: "Phone number and currency are required to create a wallet" 
      });
    }

    // 2. Check if the user exists
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // 3. Check if user already has a wallet to prevent duplicates
    const existingWallet = await UserWallet.findOne({ userId });
    if (existingWallet) {
      return res.status(400).json({ message: "Wallet already exists for this user" });
    }

    // 4. Normalize phone number (Remove +234 or leading 0) for the account number
    const normalizedPhone = phoneNumber.replace(/^(\+234|0)/, "");

    // 5. Update User Model with phoneNumber
    // We use findByIdAndUpdate to bypass strict validation on other missing fields
    await User.findByIdAndUpdate(userId, { phoneNumber: phoneNumber });

    // 6. Create the new Wallet
    const newWallet = new UserWallet({
      userId: userId,
      balance: 0,
      currency: currency,
      accountNumber: normalizedPhone, // Using the stripped phone as the account ID
    });

    await newWallet.save();

    return res.status(201).json({
      message: "Wallet created successfully",
      wallet: newWallet,
    });
  } catch (e) {
    console.error("Error creating wallet:", e);
    // Handle duplicate key errors (e.g., if phone number is already taken)
    if (e.code === 11000) {
      return res.status(400).json({ message: "Phone number or account number already in use" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  createWallet,
};