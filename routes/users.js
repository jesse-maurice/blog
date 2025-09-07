import { Router } from 'express';

import { getUserComments } from '../controllers/commentController.js';
import {
  deleteUser,
  getUser,
  getUserBlogs,
  getUserProfile,
  getUsers,
  loginUser,
  registerUser,
  updateUser,
} from '../controllers/userController.js';
import {
  authorize,
  optionalAuth,
  protect,
} from '../middlewares/auth.js';

const router = Router();

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);

router.get("/", getUsers);
router.get("/:id", getUser);

router.get("/:id/blogs", optionalAuth, getUserBlogs);
router.get("/:id/comments", optionalAuth, getUserComments);

// Protected routes
router.get("/profile/:id", protect, getUserProfile);

// Admin only routes
router.put("/:id", protect, authorize("admin"), updateUser);
router.delete("/:id", protect, authorize("admin"), deleteUser);

export default router;
