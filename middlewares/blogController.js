import { find, countDocuments, findById, getPopular, aggregate, findOne, findByIdAndUpdate, create } from "../models/Blog.js";
import { deleteMany } from "../models/Comment.js";
import ErrorResponse from "../utils/errorResponse.js";
import { asyncHandler } from "../middlewares/error.js";

// @desc    Get all blogs
// @route   GET /api/blogs
// @access  Public
const getBlogs = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  let query = {
    status: "published",
    isPublic: true,
  };

  // If admin, show all blogs
  if (req.user && req.user.role === "admin") {
    query = {};
  }

  // Search functionality
  if (req.query.search) {
    query.$text = { $search: req.query.search };
  }

  // Category filter
  if (req.query.category) {
    query.category = req.query.category;
  }

  // Author filter
  if (req.query.author) {
    query.author = req.query.author;
  }

  // Status filter (admin only)
  if (req.query.status && req.user && req.user.role === "admin") {
    query.status = req.query.status;
  }

  // Sort options
  let sortBy = "-publishedAt";
  if (req.query.sort) {
    const validSortFields = [
      "createdAt",
      "-createdAt",
      "updatedAt",
      "-updatedAt",
      "publishedAt",
      "-publishedAt",
      "title",
      "-title",
      "views",
      "-views",
      "likes",
      "-likes",
    ];

    if (validSortFields.includes(req.query.sort)) {
      sortBy = req.query.sort;
    }
  }

  const blogs = await find(query)
    .populate("author", "username firstName lastName avatar")
    .populate("commentCount")
    .select("-content") // Don’t send full content in list
    .skip(skip)
    .limit(limit)
    .sort(sortBy);

  const blogsWithCounts = blogs.map((blog) => ({
    ...blog.toObject(),
    likeCount: blog.likes.length,
  }));

  const total = await countDocuments(query);

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
    data: blogsWithCounts,
  });
});

// @desc    Toggle like on blog
// @route   PUT /api/blogs/:id/like
// @access  Private
const toggleLikeBlog = asyncHandler(async (req, res, next) => {
  const blog = await findById(req.params.id);

  if (!blog) {
    return next(new ErrorResponse("Blog not found", 404));
  }

  if (blog.status !== "published" || !blog.isPublic) {
    return next(new ErrorResponse("Cannot like this blog", 400));
  }

  const isLiked = blog.toggleLike(req.user.id);
  await blog.save();

  res.status(200).json({
    success: true,
    message: isLiked ? "Blog liked" : "Blog unliked",
    data: {
      likeCount: blog.likes.length,
      isLiked,
    },
  });
});

// @desc    Get popular blogs
// @route   GET /api/blogs/popular
// @access  Public
const getPopularBlogs = asyncHandler(async (req, res, next) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const blogs = await getPopular(limit);

  const blogsWithCounts = blogs.map((blog) => ({
    ...blog,
    commentCount: 0,
  }));

  res.status(200).json({
    success: true,
    count: blogs.length,
    data: blogsWithCounts,
  });
});

// @desc    Get blogs by category
// @route   GET /api/blogs/category/:category
// @access  Public
const getBlogsByCategory = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const query = {
    category: req.params.category,
    status: "published",
    isPublic: true,
  };

  const blogs = await find(query)
    .populate("author", "username firstName lastName avatar")
    .populate("commentCount")
    .select("-content")
    .skip(skip)
    .limit(limit)
    .sort("-publishedAt");

  const blogsWithCounts = blogs.map((blog) => ({
    ...blog.toObject(),
    likeCount: blog.likes.length,
  }));

  const total = await countDocuments(query);

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
    data: blogsWithCounts,
  });
});

// @desc    Search blogs
// @route   GET /api/blogs/search
// @access  Public
const searchBlogs = asyncHandler(async (req, res, next) => {
  const { q: searchQuery } = req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  if (!searchQuery) {
    return next(new ErrorResponse("Search query is required", 400));
  }

  const query = {
    $text: { $search: searchQuery },
    status: "published",
    isPublic: true,
  };

  const blogs = await find(query)
    .populate("author", "username firstName lastName avatar")
    .populate("commentCount")
    .select("-content")
    .skip(skip)
    .limit(limit)
    .sort({ score: { $meta: "textScore" } });

  const blogsWithCounts = blogs.map((blog) => ({
    ...blog.toObject(),
    likeCount: blog.likes.length,
  }));

  const total = await countDocuments(query);

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
    searchQuery,
    data: blogsWithCounts,
  });
});

// @desc    Get user's own blogs
// @route   GET /api/blogs/my
// @access  Private
const getMyBlogs = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const query = { author: req.user.id };

  if (req.query.status) {
    query.status = req.query.status;
  }
  if (req.query.category) {
    query.category = req.query.category;
  }

  const blogs = await find(query)
    .populate("author", "username firstName lastName avatar")
    .populate("commentCount")
    .skip(skip)
    .limit(limit)
    .sort("-updatedAt");

  const blogsWithCounts = blogs.map((blog) => ({
    ...blog.toObject(),
    likeCount: blog.likes.length,
  }));

  const total = await countDocuments(query);

  const statusCounts = await aggregate([
    { $match: { author: req.user._id } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const stats = { draft: 0, published: 0, archived: 0 };
  statusCounts.forEach((item) => {
    stats[item._id] = item.count;
  });

  res.status(200).json({
    success: true,
    count: blogs.length,
    total,
    stats,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
    data: blogsWithCounts,
  });
});

// @desc    Get single blog
// @route   GET /api/blogs/:id
// @access  Public
const getBlog = asyncHandler(async (req, res, next) => {
  let query = { _id: req.params.id };

  if (!req.user) {
    query.status = "published";
    query.isPublic = true;
  }

  const blog = await findOne(query)
    .populate("author", "username firstName lastName avatar bio")
    .populate("commentCount");

  if (!blog) {
    return next(new ErrorResponse("Blog not found", 404));
  }

  if (blog.status !== "published" || !blog.isPublic) {
    if (
      !req.user ||
      (req.user.id !== blog.author._id.toString() && req.user.role !== "admin")
    ) {
      return next(new ErrorResponse("Not authorized to view this blog", 403));
    }
  }

  if (
    blog.status === "published" &&
    (!req.user || req.user.id !== blog.author._id.toString())
  ) {
    await findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    blog.views += 1;
  }

  let isLiked = false;
  if (req.user) {
    isLiked = blog.isLikedBy(req.user.id);
  }

  res.status(200).json({
    success: true,
    data: {
      ...blog.toObject(),
      likeCount: blog.likes.length,
      isLiked,
    },
  });
});

// @desc    Create new blog
// @route   POST /api/blogs
// @access  Private
const createBlog = asyncHandler(async (req, res, next) => {
  req.body.author = req.user.id;
  const blog = await create(req.body);

  const populatedBlog = await findById(blog._id).populate(
    "author",
    "username firstName lastName avatar"
  );

  res.status(201).json({
    success: true,
    data: populatedBlog,
  });
});

// @desc    Update blog
// @route   PUT /api/blogs/:id
// @access  Private
const updateBlog = asyncHandler(async (req, res, next) => {
  let blog = await findById(req.params.id);

  if (!blog) {
    return next(new ErrorResponse("Blog not found", 404));
  }

  if (blog.author.toString() !== req.user.id && req.user.role !== "admin") {
    return next(new ErrorResponse("Not authorized to update this blog", 403));
  }

  if (req.body.author && req.user.role !== "admin") {
    delete req.body.author;
  }

  blog = await findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate("author", "username firstName lastName avatar");

  res.status(200).json({
    success: true,
    data: blog,
  });
});

// @desc    Delete blog
// @route   DELETE /api/blogs/:id
// @access  Private
const deleteBlog = asyncHandler(async (req, res, next) => {
  const blog = await findById(req.params.id);

  if (!blog) {
    return next(new ErrorResponse("Blog not found", 404));
  }

  if (blog.author.toString() !== req.user.id && req.user.role !== "admin") {
    return next(new ErrorResponse("Not authorized to delete this blog", 403));
  }

  await deleteMany({ blog: req.params.id });
  await blog.deleteOne();

  res.status(200).json({
    success: true,
    message: "Blog deleted successfully",
  });
});

export default {
  getBlogs,
  toggleLikeBlog,
  getPopularBlogs,
  getBlogsByCategory,
  searchBlogs,
  getMyBlogs,
  getBlog,
  createBlog,
  updateBlog,
  deleteBlog,
};
