import { Router } from 'express';

import {
  deleteComment,
  getComment,
  getCommentReplies,
  toggleLikeComment,
  updateComment,
} from '../controllers/commentController.js';
import {
  checkOwnership,
  optionalAuth,
  protect,
} from '../middlewares/auth.js';
import {
  validateMongoId,
  validatePagination,
} from '../middlewares/validation.js';
import Comment from '../models/Comment.js';

const router = Router();

// Public routes
router.get("/:id", validateMongoId("id"), optionalAuth, getComment);
router.get(
  "/:id/replies",
  validateMongoId("id"),
  validatePagination,
  optionalAuth,
  getCommentReplies
);

// Protected routes
router.put(
  "/:id",
  protect,
  validateMongoId("id"),
  checkOwnership(Comment),
  updateComment
);

router.delete(
  "/:id",
  protect,
  validateMongoId("id"),
  checkOwnership(Comment),
  deleteComment
);

router.put("/:id/like", protect, validateMongoId("id"), toggleLikeComment);

export default router;
