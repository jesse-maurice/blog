import { asyncHandler } from '../middlewares/error.js';
import Blog from '../models/Blog.js';
import Comment from '../models/Comment.js';
import ErrorResponse from '../utils/errorResponse.js';

// @desc    Get all blogs with filters, pagination, sorting
// @route   GET /api/blogs
// @access  Public
export const getBlogs = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const query = {};

  if (req.query.category) query.category = req.query.category;
  if (req.query.author) query.author = req.query.author;
  if (req.query.search) query.$text = { $search: req.query.search };

  const total = await Blog.countDocuments(query);

  const blogs = await Blog.find(query)
    .populate("author", "name")
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: blogs.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: blogs,
  });
});

// @desc    Get single blog
// @route   GET /api/blogs/:id
// @access  Public
export const getBlog = asyncHandler(async (req, res, next) => {
  const blog = await Blog.findById(req.params.id).populate("author", "name");

  if (!blog) return next(new ErrorResponse("Blog not found", 404));

  res.status(200).json({ success: true, data: blog });
});

// @desc    Get popular blogs
// @route   GET /api/blogs/popular
// @access  Public
export const getPopularBlogs = asyncHandler(async (req, res, next) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const blogs = await Blog.getPopular(limit);
  res.status(200).json({ success: true, count: blogs.length, data: blogs });
});

// @desc    Get blogs by category
// @route   GET /api/blogs/category/:category
// @access  Public
export const getBlogsByCategory = asyncHandler(async (req, res, next) => {
  const blogs = await Blog.find({ category: req.params.category })
    .populate("author", "name")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: blogs.length, data: blogs });
});

// @desc    Search blogs
// @route   GET /api/blogs/search?q=keyword
// @access  Public
export const searchBlogs = asyncHandler(async (req, res, next) => {
  const q = req.query.q;
  if (!q) return next(new ErrorResponse("Search query missing", 400));

  const blogs = await Blog.find({ $text: { $search: q } })
    .populate("author", "name")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: blogs.length, data: blogs });
});

// @desc    Create new blog
// @route   POST /api/blogs
// @access  Private
export const createBlog = asyncHandler(async (req, res, next) => {
  req.body.author = req.user.id;
  const blog = await Blog.create(req.body);
  res.status(201).json({ success: true, data: blog });
});

// @desc    Update blog
// @route   PUT /api/blogs/:id
// @access  Private
export const updateBlog = asyncHandler(async (req, res, next) => {
  let blog = await Blog.findById(req.params.id);
  if (!blog) return next(new ErrorResponse("Blog not found", 404));

  if (blog.author.toString() !== req.user.id)
    return next(new ErrorResponse("Not authorized to update this blog", 401));

  blog = await Blog.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, data: blog });
});

// @desc    Delete blog
// @route   DELETE /api/blogs/:id
// @access  Private
export const deleteBlog = asyncHandler(async (req, res, next) => {
  const blog = await Blog.findById(req.params.id);
  if (!blog) return next(new ErrorResponse("Blog not found", 404));

  if (blog.author.toString() !== req.user.id)
    return next(new ErrorResponse("Not authorized to delete this blog", 401));

  await Comment.deleteMany({ blog: req.params.id });
  await blog.deleteOne();

  res.status(200).json({ success: true, data: {} });
});

// @desc    Toggle like blog
// @route   PUT /api/blogs/:id/like
// @access  Private
export const toggleLikeBlog = asyncHandler(async (req, res, next) => {
  const blog = await Blog.findById(req.params.id);
  if (!blog) return next(new ErrorResponse("Blog not found", 404));

  const userId = req.user.id;
  const liked = blog.likes.includes(userId);

  if (liked) {
    blog.likes.pull(userId);
  } else {
    blog.likes.push(userId);
  }

  await blog.save();
  res
    .status(200)
    .json({ success: true, liked: !liked, likes: blog.likes.length });
});

// @desc    Get my blogs
// @route   GET /api/blogs/my
// @access  Private
export const getMyBlogs = asyncHandler(async (req, res, next) => {
  const blogs = await Blog.find({ author: req.user.id }).sort({
    createdAt: -1,
  });
  res.status(200).json({ success: true, count: blogs.length, data: blogs });
});

// @desc    Blog status stats
// @route   GET /api/blogs/stats/status
// @access  Private/Admin
export const getBlogStatusStats = asyncHandler(async (req, res, next) => {
  const statusCounts = await Blog.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  res.status(200).json({ success: true, data: statusCounts });
});
