import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { asyncHandler } from '../middlewares/error.js';
import Blog from '../models/Blog.js';
import User from '../models/User.js';
import ErrorResponse from '../utils/errorResponse.js';

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const query = { isActive: true };
  if (req.query.search) {
    query.$or = [
      { username: { $regex: req.query.search, $options: "i" } },
      { firstName: { $regex: req.query.search, $options: "i" } },
      { lastName: { $regex: req.query.search, $options: "i" } },
      { email: { $regex: req.query.search, $options: "i" } },
    ];
  }

  const users = await User.find(query)
    .select("-password")
    .skip(skip)
    .limit(limit)
    .sort("-createdAt");

  const total = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    count: users.length,
    total,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
    data: users,
  });
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Public
const getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({
    _id: req.params.id,
    isActive: true,
  }).select("-password -email");
  if (!user) return next(new ErrorResponse("User not found", 404));

  const blogCount = await Blog.countDocuments({
    author: user._id,
    status: "published",
    isPublic: true,
  });

  res.status(200).json({
    success: true,
    data: { ...user.toObject(), blogCount },
  });
});

// @desc    Get user profile
// @route   GET /api/users/profile/:id
// @access  Private (Own profile or Admin)
const getUserProfile = asyncHandler(async (req, res, next) => {
  if (req.params.id !== req.user.id && req.user.role !== "admin") {
    return next(new ErrorResponse("Not authorized", 403));
  }

  const user = await User.findOne({
    _id: req.params.id,
    isActive: true,
  }).select("-password");
  if (!user) return next(new ErrorResponse("User not found", 404));

  const stats = await Blog.aggregate([
    { $match: { author: user._id } },
    {
      $group: {
        _id: null,
        totalBlogs: { $sum: 1 },
        publishedBlogs: {
          $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] },
        },
        draftBlogs: { $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] } },
        totalViews: { $sum: "$views" },
        totalLikes: { $sum: { $size: "$likes" } },
      },
    },
  ]);

  const userStats = stats[0] || {
    totalBlogs: 0,
    publishedBlogs: 0,
    draftBlogs: 0,
    totalViews: 0,
    totalLikes: 0,
  };

  res.status(200).json({
    success: true,
    data: { ...user.toObject(), stats: userStats },
  });
});

// @desc    Register new user
// @route   POST /api/users/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, firstName, lastName } = req.body;

  // Simple required fields check
  if (!username || !email || !password) {
    return res.status(400).json({
      error: "Username, email, and password are required",
    });
  }

  // Check for existing user
  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    return res.status(400).json({
      error: existingUser.email === email ? "Email already exists" : "Username already exists",
    });
  }

  // Hash password
  const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(10));

  // Create user
  const newUser = await User.create({
    username,
    email,
    password: hashedPassword,
    firstName,
    lastName,
  });

  // Generate JWT
  const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });

  res.status(201).json({
    success: true,
    token,
    data: {
      id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
    },
  });
});

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body; // use email

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ email }).select("+password"); // include password
    if (!user) {
      return res
        .status(400)
        .json({ message: "User not found, please register first!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Email or password is incorrect" });
    }

    const getToken = (id) => {
      return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || "7d",
      });
    };

    // Optional: set cookie
    res.cookie("accessToken", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    res.status(200).json({
      message: "Login successful",
      token, // also return token for API testing
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new ErrorResponse("User not found", 404));

  const fieldsToUpdate = { ...req.body }; // simple update
  if (fieldsToUpdate.password) {
    const salt = bcrypt.genSaltSync(10);
    fieldsToUpdate.password = bcrypt.hashSync(fieldsToUpdate.password, salt);
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    fieldsToUpdate,
    { new: true }
  ).select("-password");
  res.status(200).json({ success: true, data: updatedUser });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  user.isActive = false;
  await user.save();

  res
    .status(200)
    .json({ success: true, message: "User deactivated successfully" });
});

// @desc    Get user's blogs
// @route   GET /api/users/:id/blogs
// @access  Public
const getUserBlogs = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const user = await User.findOne({
    _id: req.params.id,
    isActive: true,
  }).select("username firstName lastName");
  if (!user) return res.status(404).json({ error: "User not found" });

  const query = { author: req.params.id, status: "published", isPublic: true };
  if (
    req.user &&
    (req.user.id === req.params.id || req.user.role === "admin")
  ) {
    delete query.status;
    delete query.isPublic;
  }

  if (req.query.category) query.category = req.query.category;

  const blogs = await Blog.find(query)
    .populate("author", "username firstName lastName avatar")
    .select("-content")
    .skip(skip)
    .limit(limit)
    .sort(req.query.sort || "-publishedAt");

  const total = await Blog.countDocuments(query);

  res.status(200).json({
    success: true,
    count: blogs.length,
    total,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
    user,
    data: blogs,
  });
});

export {
  deleteUser,
  getUser,
  getUserBlogs,
  getUserProfile,
  getUsers,
  loginUser,
  registerUser,
  updateUser,
};
