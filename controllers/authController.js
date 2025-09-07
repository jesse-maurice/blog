import User from "../models/User.js";
import ErrorResponse from "../utils/errorResponse.js";
import { asyncHandler } from "../middlewares/error.js";

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res, next) => {
  const { username, email, password, firstName, lastName, bio } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    const field = existingUser.email === email ? "Email" : "Username";
    return next(new ErrorResponse(`${field} already exists`, 400));
  }

  // Create user
  const user = await User.create({
    username,
    email,
    password,
    firstName,
    lastName,
    bio: bio || "",
  });

  sendTokenResponse(user, 201, res);
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // Find user by credentials (static method from User model)
    const user = await User.findByCredentials(email, password);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    return next(new ErrorResponse("Invalid credentials", 401));
  }
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res, next) => {
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
const updateDetails = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    username: req.body.username,
    email: req.body.email,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    bio: req.body.bio,
  };

  // Remove undefined fields
  Object.keys(fieldsToUpdate).forEach((key) => {
    if (fieldsToUpdate[key] === undefined) {
      delete fieldsToUpdate[key];
    }
  });

  // Check if username or email already exists (if being updated)
  if (fieldsToUpdate.username || fieldsToUpdate.email) {
    const query = [];
    if (fieldsToUpdate.username)
      query.push({ username: fieldsToUpdate.username });
    if (fieldsToUpdate.email) query.push({ email: fieldsToUpdate.email });

    const existingUser = await User.findOne({
      $and: [{ _id: { $ne: req.user.id } }, { $or: query }],
    });

    if (existingUser) {
      const field =
        existingUser.email === fieldsToUpdate.email ? "Email" : "Username";
      return next(new ErrorResponse(`${field} already exists`, 400));
    }
  }

  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
const updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("+password");

  // Check current password
  if (!(await user.comparePassword(req.body.currentPassword))) {
    return next(new ErrorResponse("Current password is incorrect", 400));
  }

  user.password = req.body.newPassword;
  await user.save();

  sendTokenResponse(user, 200, res);
});

// @desc    Delete account (soft delete)
// @route   DELETE /api/auth/deleteaccount
// @access  Private
const deleteAccount = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  user.isActive = false;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Account deactivated successfully",
  });
});

// Helper: generate token + send response
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.generateToken();

  // Hide password
  user.password = undefined;

  res.status(statusCode).json({
    success: true,
    token,
    data: user,
  });
};

export {
  register,
  login,
  logout,
  getMe,
  updateDetails,
  updatePassword,
  deleteAccount,
};
