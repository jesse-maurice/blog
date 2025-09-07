import { Schema, model } from "mongoose";

const blogSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Blog title is required"],
      trim: true,
      minlength: [5, "Title must be at least 5 characters long"],
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    content: {
      type: String,
      required: [true, "Blog content is required"],
      minlength: [50, "Content must be at least 50 characters long"],
    },
    summary: {
      type: String,
      required: [true, "Blog summary is required"],
      maxlength: [300, "Summary cannot exceed 300 characters"],
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
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
      ],
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: [30, "Tag cannot exceed 30 characters"],
      },
    ],
    featuredImage: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    readTime: {
      type: Number,
      default: function () {
        // Calculate read time based on content length (assuming 200 words per minute)
        const wordCount = this.content.split(" ").length;
        return Math.ceil(wordCount / 200);
      },
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        likedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    publishedAt: {
      type: Date,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for like count
blogSchema.virtual("likeCount").get(function () {
  return this.likes ? this.likes.length : 0;
});

// Virtual for comment count (will be calculated from Comment model)
blogSchema.virtual("commentCount", {
  ref: "Comment",
  localField: "_id",
  foreignField: "blog",
  count: true,
});

// Index for better search performance
blogSchema.index({ title: "text", content: "text", summary: "text" });
blogSchema.index({ author: 1, status: 1 });
blogSchema.index({ category: 1, status: 1 });
blogSchema.index({ createdAt: -1 });
blogSchema.index({ publishedAt: -1 });

// Update publishedAt when status changes to published
blogSchema.pre("save", function (next) {
  if (
    this.isModified("status") &&
    this.status === "published" &&
    !this.publishedAt
  ) {
    this.publishedAt = new Date();
  }

  this.updatedAt = Date.now();
  next();
});

// Method to check if user has liked the blog
blogSchema.methods.isLikedBy = function (userId) {
  return this.likes.some((like) => like.user.toString() === userId.toString());
};

// Method to add/remove like
blogSchema.methods.toggleLike = function (userId) {
  const existingLikeIndex = this.likes.findIndex(
    (like) => like.user.toString() === userId.toString()
  );

  if (existingLikeIndex > -1) {
    this.likes.splice(existingLikeIndex, 1);
    return false; // Unliked
  } else {
    this.likes.push({ user: userId });
    return true; // Liked
  }
};

// Static method to get popular blogs
blogSchema.statics.getPopular = function (limit = 10) {
  return this.aggregate([
    { $match: { status: "published", isPublic: true } },
    { $addFields: { likeCount: { $size: "$likes" } } },
    { $sort: { likeCount: -1, views: -1, publishedAt: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "users",
        localField: "author",
        foreignField: "_id",
        as: "author",
        pipeline: [{ $project: { password: 0, email: 0 } }],
      },
    },
    { $unwind: "$author" },
  ]);
};

export default model("Blog", blogSchema);
