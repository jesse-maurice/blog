import { Router } from 'express';

import {
  deleteAccount,
  getMe,
  login,
  logout,
  register,
  updateDetails,
  updatePassword,
} from '../controllers/authController.js';
import { protect } from '../middlewares/auth.js';
import {
  validateUserRegistration,
  validateUserUpdate,
} from '../middlewares/validation.js';

const router = Router();

// Public routes
router.post("/register", validateUserRegistration, register);
router.post("/login", login);
router.post("/logout", logout);

// Protected routes
router.get("/me", protect, getMe);
router.put("/updatedetails", protect, validateUserUpdate, updateDetails);
router.put("/updatepassword", protect, updatePassword);
router.delete("/deleteaccount", protect, deleteAccount);

export default router;
