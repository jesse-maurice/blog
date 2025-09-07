import cors from 'cors';
import express, {
  json,
  static as staticFiles,
  urlencoded,
} from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import {
  dirname,
  join,
} from 'path';
import { fileURLToPath } from 'url';

// Import middleware
import {
  errorHandler,
  notFound,
} from './middlewares/error.js';
// Import routes
import authRoutes from './routes/auth.js';
import blogRoutes from './routes/blogs.js';
import commentRoutes from './routes/comments.js';
import userRoutes from './routes/users.js';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.CLIENT_URL,
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
    ];

    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", limiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// Body parser middleware
app.use(json({ limit: "10mb" }));
app.use(urlencoded({ extended: true, limit: "10mb" }));

// Static files
app.use("/uploads", staticFiles(join(__dirname, "uploads")));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/comments", commentRoutes);

// API documentation route
app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "Blog Platform API",
    version: "1.0.0",
    endpoints: {
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        logout: "POST /api/auth/logout",
      },
      users: {
        list: "GET /api/users",
        details: "GET /api/users/:id",
        update: "PUT /api/users/:id",
        delete: "DELETE /api/users/:id",
      },
      blogs: {
        list: "GET /api/blogs",
        create: "POST /api/blogs",
        details: "GET /api/blogs/:id",
        update: "PUT /api/blogs/:id",
        delete: "DELETE /api/blogs/:id",
      },
      comments: {
        list: "GET /api/comments",
        create: "POST /api/comments",
        details: "GET /api/comments/:id",
        update: "PUT /api/comments/:id",
        delete: "DELETE /api/comments/:id",
      },
    },
  });
});

// Not found middleware
app.use(notFound);

// Error handler middleware
app.use(errorHandler);

export default app;
