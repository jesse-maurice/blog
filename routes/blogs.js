import { Router } from 'express';

import {
  createBlog,
  deleteBlog,
  getBlog,
  getBlogs,
  getBlogsByCategory,
  getMyBlogs,
  getPopularBlogs,
  searchBlogs,
  toggleLikeBlog,
  updateBlog,
} from '../controllers/blogController.js';
import {
  createComment,
  getComments,
} from '../controllers/commentController.js';
import {
  checkOwnership,
  optionalAuth,
  protect,
} from '../middlewares/auth.js';
import {
  validateBlogCreate,
  validateBlogQuery,
  validateBlogUpdate,
  validateCommentCreate,
  validateMongoId,
  validatePagination,
} from '../middlewares/validation.js';
import Blog from '../models/Blog.js';

const router = Router();

// Public routes
router.get("/", validatePagination, validateBlogQuery, optionalAuth, getBlogs);
router.get("/popular", validatePagination, getPopularBlogs);
router.get("/search", validatePagination, searchBlogs);
router.get("/category/:category", validatePagination, getBlogsByCategory);
router.get("/:id", validateMongoId("id"), optionalAuth, getBlog);

// Comment routes for specific blog
router.get(
  "/:blogId/comments",
  validateMongoId("blogId"),
  validatePagination,
  optionalAuth,
  getComments
);

router.post(
  "/:blogId/comments",
  protect,
  validateMongoId("blogId"),
  validateCommentCreate,
  createComment
);

// Protected routes
router.post("/", protect, validateBlogCreate, createBlog);
router.get(
  "/my/blogs",
  protect,
  validatePagination,
  validateBlogQuery,
  getMyBlogs
);

router.put(
  "/:id",
  protect,
  validateMongoId("id"),
  checkOwnership(Blog),
  validateBlogUpdate,
  updateBlog
);

router.delete(
  "/:id",
  protect,
  validateMongoId("id"),
  checkOwnership(Blog),
  deleteBlog
);

router.put("/:id/like", protect, validateMongoId("id"), toggleLikeBlog);

export default router;
