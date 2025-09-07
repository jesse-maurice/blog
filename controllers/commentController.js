import { asyncHandler } from '../middlewares/error.js';
import Blog from '../models/Blog.js';
import Comment from '../models/Comment.js';
import ErrorResponse from '../utils/errorResponse.js';

// @desc    Get all comments for a blog
// @route   GET /api/blogs/:blogId/comments
// @access  Public
const getComments = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;

  const blog = await Blog.findById(req.params.blogId);
  if (!blog) return next(new ErrorResponse("Blog not found", 404));

  if (blog.status !== "published" || !blog.isPublic) {
    if (
      !req.user ||
      (req.user.id !== blog.author.toString() && req.user.role !== "admin")
    ) {
      return next(
        new ErrorResponse("Not authorized to view comments for this blog", 403)
      );
    }
  }

  try {
    // If you have a custom helper:
    // const comments = await getCommentsWithReplies(req.params.blogId);

    const query = { blog: req.params.blogId, isDeleted: false };

    const comments = await Comment.find(query)
      .populate("author", "username firstName lastName avatar")
      .populate("parentComment")
      .sort("-createdAt");

    const total = await Comment.countDocuments(query);

    const skip = (page - 1) * limit;
    const paginatedComments = comments.slice(skip, skip + limit);

    res.status(200).json({
      success: true,
      count: paginatedComments.length,
      total,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
      data: paginatedComments,
    });
  } catch (error) {
    return next(new ErrorResponse("Error fetching comments", 500));
  }
});

// @desc    Get single comment
// @route   GET /api/comments/:id
// @access  Public
const getComment = asyncHandler(async (req, res, next) => {
  const comment = await Comment.findOne({
    _id: req.params.id,
    isDeleted: false,
  })
    .populate("author", "username firstName lastName avatar")
    .populate("blog", "title author")
    .populate("parentComment", "content author");

  if (!comment) return next(new ErrorResponse("Comment not found", 404));

  const blog = await Blog.findById(comment.blog._id);
  if (blog.status !== "published" || !blog.isPublic) {
    if (
      !req.user ||
      (req.user.id !== blog.author.toString() && req.user.role !== "admin")
    ) {
      return next(
        new ErrorResponse("Not authorized to view this comment", 403)
      );
    }
  }

  let isLiked = false;
  if (req.user) isLiked = comment.isLikedBy(req.user.id);

  res.status(200).json({
    success: true,
    data: {
      ...comment.toObject(),
      likeCount: comment.likes.length,
      isLiked,
    },
  });
});

// @desc    Create new comment
// @route   POST /api/blogs/:blogId/comments
// @access  Private
const createComment = asyncHandler(async (req, res, next) => {
  const blog = await Blog.findById(req.params.blogId);
  if (!blog) return next(new ErrorResponse("Blog not found", 404));

  if (blog.status !== "published" || !blog.isPublic) {
    return next(new ErrorResponse("Cannot comment on this blog", 400));
  }

  if (req.body.parentComment) {
    const parentComment = await Comment.findOne({
      _id: req.body.parentComment,
      blog: req.params.blogId,
      isDeleted: false,
    });
    if (!parentComment)
      return next(new ErrorResponse("Parent comment not found", 404));
  }

  const comment = await Comment.create({
    content: req.body.content,
    author: req.user.id,
    blog: req.params.blogId,
    parentComment: req.body.parentComment || null,
  });

  const populatedComment = await Comment.findById(comment._id)
    .populate("author", "username firstName lastName avatar")
    .populate("parentComment", "content author");

  res.status(201).json({
    success: true,
    data: populatedComment,
  });
});

// @desc    Update comment
// @route   PUT /api/comments/:id
// @access  Private (Author or Admin)
const updateComment = asyncHandler(async (req, res, next) => {
  let comment = await Comment.findOne({
    _id: req.params.id,
    isDeleted: false,
  });
  if (!comment) return next(new ErrorResponse("Comment not found", 404));

  if (comment.author.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new ErrorResponse("Not authorized to update this comment", 403)
    );
  }

  comment = await Comment.findByIdAndUpdate(
    req.params.id,
    { content: req.body.content },
    { new: true, runValidators: true }
  ).populate("author", "username firstName lastName avatar");

  res.status(200).json({
    success: true,
    data: comment,
  });
});

// @desc    Delete comment
// @route   DELETE /api/comments/:id
// @access  Private (Author or Admin)
const deleteComment = asyncHandler(async (req, res, next) => {
  const comment = await Comment.findOne({
    _id: req.params.id,
    isDeleted: false,
  });
  if (!comment) return next(new ErrorResponse("Comment not found", 404));

  if (comment.author.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new ErrorResponse("Not authorized to delete this comment", 403)
    );
  }

  await comment.softDelete();

  res.status(200).json({
    success: true,
    message: "Comment deleted successfully",
  });
});

// @desc    Toggle like on comment
// @route   PUT /api/comments/:id/like
// @access  Private
const toggleLikeComment = asyncHandler(async (req, res, next) => {
  const comment = await Comment.findOne({
    _id: req.params.id,
    isDeleted: false,
  });
  if (!comment) return next(new ErrorResponse("Comment not found", 404));

  const blog = await Blog.findById(comment.blog);
  if (blog.status !== "published" || !blog.isPublic) {
    return next(new ErrorResponse("Cannot interact with this comment", 400));
  }

  const isLiked = comment.toggleLike(req.user.id);
  await comment.save();

  res.status(200).json({
    success: true,
    message: isLiked ? "Comment liked" : "Comment unliked",
    data: {
      likeCount: comment.likes.length,
      isLiked,
    },
  });
});

// @desc    Get replies for a comment
// @route   GET /api/comments/:id/replies
// @access  Public
const getCommentReplies = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const parentComment = await Comment.findOne({
    _id: req.params.id,
    isDeleted: false,
  }).populate("blog");

  if (!parentComment) return next(new ErrorResponse("Comment not found", 404));

  const blog = parentComment.blog;
  if (blog.status !== "published" || !blog.isPublic) {
    if (
      !req.user ||
      (req.user.id !== blog.author.toString() && req.user.role !== "admin")
    ) {
      return next(new ErrorResponse("Not authorized to view replies", 403));
    }
  }

  const query = { parentComment: req.params.id, isDeleted: false };

  const replies = await Comment.find(query)
    .populate("author", "username firstName lastName avatar")
    .skip(skip)
    .limit(limit)
    .sort("createdAt");

  const repliesWithCounts = replies.map((reply) => ({
    ...reply.toObject(),
    likeCount: reply.likes.length,
    isLiked: req.user ? reply.isLikedBy(req.user.id) : false,
  }));

  const total = await Comment.countDocuments(query);

  res.status(200).json({
    success: true,
    count: replies.length,
    total,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
    data: repliesWithCounts,
  });
});

// @desc    Get user's comments
// @route   GET /api/users/:userId/comments
// @access  Public
const getUserComments = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const query = { author: req.params.userId, isDeleted: false };

  let blogFilter = { status: "published", isPublic: true };
  if (
    req.user &&
    (req.user.id === req.params.userId || req.user.role === "admin")
  ) {
    blogFilter = {};
  }

  const comments = await Comment.find(query)
    .populate("author", "username firstName lastName avatar")
    .populate({
      path: "blog",
      match: blogFilter,
      select: "title author status isPublic",
    })
    .skip(skip)
    .limit(limit)
    .sort("-createdAt");

  const filteredComments = comments.filter((comment) => comment.blog);

  const commentsWithCounts = filteredComments.map((comment) => ({
    ...comment.toObject(),
    likeCount: comment.likes.length,
  }));

  res.status(200).json({
    success: true,
    count: commentsWithCounts.length,
    data: commentsWithCounts,
  });
});

export {
  createComment,
  deleteComment,
  getComment,
  getCommentReplies,
  getComments,
  getUserComments,
  toggleLikeComment,
  updateComment,
};
