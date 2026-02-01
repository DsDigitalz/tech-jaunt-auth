const jwt = require("jsonwebtoken");

/**
 * Authentication middleware
 * Checks if request has a valid JWT token
 * Allows access only if token is valid
 */
const isAuth = (req, res, next) => {
  // Get Authorization header: "Bearer <token>"
  const authHeader = req.headers.authorization;

  // Check if header exists and starts with "Bearer "
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authorization header missing or malformed",
    });
  }

  // Extract token from "Bearer <token>"
  const token = authHeader.split(" ")[1];

  try {
    // Ensure JWT secret exists in environment variables
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined");
    }

    // Verify token and decode payload
    // If token is invalid or expired, this will throw an error
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach decoded user data to request object
    // This allows access in protected routes via req.user
    req.user = decoded;

    // Move to the next middleware or controller
    next();
  } catch (error) {
    // Handle expired token
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token expired. Please login again.",
      });
    }

    // Handle invalid token
    return res.status(401).json({
      message: "Invalid authentication token",
    });
  }
};

module.exports = isAuth;
