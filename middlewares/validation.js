import {
  body,
  query,
  validationResult,
} from 'express-validator';
import mongoose from 'mongoose';

// Handle validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
        value: error.value,
      })),
    });
  }
  next();
};

// Validate MongoDB ID
export const validateMongoId = (param = "id") => {
  return (req, res, next) => {
    const id = req.params[param];
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${param}: ${id}`,
      });
    }
    next();
  };
};

// Blog query validation
export const validateBlogQuery = [
  query("category")
    .optional()
    .isString()
    .withMessage("Category must be a string"),
  query("author")
    .optional()
    .isMongoId()
    .withMessage("Author must be a valid Mongo ID"),
  query("search").optional().isString().withMessage("Search must be a string"),
];

// Pagination validation
export const validatePagination = (req, res, next) => {
  let { page = 1, limit = 10 } = req.query;
  page = parseInt(page);
  limit = parseInt(limit);

  if (isNaN(page) || isNaN(limit) || page <= 0 || limit <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid pagination values",
    });
  }

  req.pagination = { page, limit };
  next();
};

// Comment validation
export const validateCommentCreate = [
  body("content").notEmpty().withMessage("Comment content is required"),
];

// User validation
export const validateUserRegistration = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores"),

  body("email")
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),

  body("firstName").trim().notEmpty().withMessage("First name is required"),
  body("lastName").trim().notEmpty().withMessage("Last name is required"),

  handleValidationErrors,
];

export const validateUserLogin = [
  body("email")
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),

  body("password").notEmpty().withMessage("Password is required"),

  handleValidationErrors,
];

export const validateUserUpdate = [
  body("username")
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores"),

  body("email")
    .optional()
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),

  body("firstName")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("First name cannot exceed 50 characters"),
  body("lastName")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Last name cannot exceed 50 characters"),
  body("bio")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Bio cannot exceed 500 characters"),

  handleValidationErrors,
];

// Blog validation
export const validateBlogCreate = [
  body("title")
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage("Title must be between 5 and 200 characters"),
  body("content")
    .trim()
    .isLength({ min: 50 })
    .withMessage("Content must be at least 50 characters long"),
  body("summary")
    .trim()
    .isLength({ min: 10, max: 300 })
    .withMessage("Summary must be between 10 and 300 characters"),
  body("category")
    .isIn([
      "technology",
      "lifestyle",
      "travel",
      "food",
      "health",
      "business",
      "education",
      "entertainment",
      "sports",
      "other",
    ])
    .withMessage("Please select a valid category"),
  body("tags")
    .optional()
    .isArray({ max: 10 })
    .withMessage("Tags must be an array with maximum 10 items"),
  body("tags.*")
    .optional()
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage("Each tag must be between 1 and 30 characters"),
  body("status")
    .optional()
    .isIn(["draft", "published"])
    .withMessage("Status must be either draft or published"),
  body("isPublic")
    .optional()
    .isBoolean()
    .withMessage("isPublic must be a boolean value"),

  handleValidationErrors,
];

export const validateBlogUpdate = [
  body("title")
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage("Title must be between 5 and 200 characters"),
  body("content")
    .optional()
    .trim()
    .isLength({ min: 50 })
    .withMessage("Content must be at least 50 characters long"),
  body("summary")
    .optional()
    .trim()
    .isLength({ min: 10, max: 300 })
    .withMessage("Summary must be between 10 and 300 characters"),
  body("category")
    .optional()
    .isIn([
      "technology",
      "lifestyle",
      "travel",
      "food",
      "health",
      "business",
      "education",
      "entertainment",
      "sports",
      "other",
    ])
    .withMessage("Please select a valid category"),
  body("tags")
    .optional()
    .isArray({ max: 10 })
    .withMessage("Tags must be an array with maximum 10 items"),
  body("tags.*")
    .optional()
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage("Each tag must be between 1 and 30 characters"),
  body("status")
    .optional()
    .isIn(["draft", "published"])
    .withMessage("Status must be either draft or published"),
  body("isPublic")
    .optional()
    .isBoolean()
    .withMessage("isPublic must be a boolean value"),

  handleValidationErrors,
];

export { handleValidationErrors };
