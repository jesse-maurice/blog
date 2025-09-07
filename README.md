# Blog Platform Backend

A complete REST API for a blog platform with user authentication, blog CRUD operations, comments, likes, and admin functionality.

## Features

- **User Management**
  - User registration and authentication with JWT
  - User roles (admin, regular user)
  - Profile management
  - Password updates

- **Blog Management**
  - Create, read, update, delete blogs
  - Blog categories and tags
  - Draft and published states
  - Blog likes and views tracking
  - Search functionality

- **Comment System**
  - Nested comments (replies)
  - Comment likes
  - Soft delete for comments

- **Admin Features**
  - User management
  - Blog moderation
  - System statistics

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **express-validator** - Input validation

## Installation

1. Clone the repository
```bash
git clone <repository-url>
cd blog-platform-backend
```

2. Install dependencies
```bash
npm install
```

3. Create environment file
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/blogplatform
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000
MAX_FILE_SIZE=5000000
FILE_UPLOAD_PATH=./uploads
```

5. Start MongoDB service

6. Run the application
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/updatedetails` - Update user details
- `PUT /api/auth/updatepassword` - Update password
- `DELETE /api/auth/deleteaccount` - Delete account

### Users
- `GET /api/users` - Get all users (Admin)
- `GET /api/users/:id` - Get user by ID
- `GET /api/users/profile/:id` - Get user profile (Private)
- `PUT /api/users/:id` - Update user (Admin)
- `DELETE /api/users/:id` - Delete user (Admin)
- `GET /api/users/:id/blogs` - Get user's blogs
- `GET /api/users/:id/comments` - Get user's comments

### Blogs
- `GET /api/blogs` - Get all blogs
- `GET /api/blogs/:id` - Get blog by ID
- `POST /api/blogs` - Create new blog (Auth required)
- `PUT /api/blogs/:id` - Update blog (Author/Admin)
- `DELETE /api/blogs/:id` - Delete blog (Author/Admin)
- `PUT /api/blogs/:id/like` - Toggle like on blog (Auth required)
- `GET /api/blogs/popular` - Get popular blogs
- `GET /api/blogs/category/:category` - Get blogs by category
- `GET /api/blogs/search` - Search blogs
- `GET /api/blogs/my/blogs` - Get current user's blogs (Auth required)

### Comments
- `GET /api/blogs/:blogId/comments` - Get blog comments
- `POST /api/blogs/:blogId/comments` - Create comment (Auth required)
- `GET /api/comments/:id` - Get comment by ID
- `PUT /api/comments/:id` - Update comment (Author/Admin)
- `DELETE /api/comments/:id` - Delete comment (Author/Admin)
- `PUT /api/comments/:id/like` - Toggle like on comment (Auth required)
- `GET /api/comments/:id/replies` - Get comment replies

## Database Models

### User Model
- username, email, password
- firstName, lastName, bio
- role (user/admin)
- avatar, isActive
- timestamps

### Blog Model
- title, content, summary
- author (ref to User)
- category, tags
- featuredImage, status
- isPublic, readTime, views
- likes array, publishedAt
- timestamps

### Comment Model
- content, author (ref to User)
- blog (ref to Blog)
- parentComment (ref to Comment for replies)
- likes array, isEdited, isDeleted
- timestamps

## Authentication & Authorization

- JWT tokens for authentication
- Role-based access control
- Route protection middleware
- Password hashing with bcrypt

## Validation & Error Handling

- Input validation using express-validator
- Centralized error handling
- Custom error responses
- Rate limiting

## Security Features

- Helmet for security headers
- CORS configuration
- Rate limiting
- Input sanitization
- Password hashing
- JWT token validation

## Development

```bash
# Install nodemon for development
npm install -g nodemon

# Run in development mode
npm run dev

# Run tests
npm test
```

## Production Deployment

1. Set NODE_ENV to 'production'
2. Use a production MongoDB instance
3. Set secure JWT_SECRET
4. Configure proper CORS origins
5. Use PM2 for process management
6. Set up reverse proxy with Nginx
7. Enable HTTPS

## API Testing

You can test the API using tools like:
- Postman
- Insomnia
- Thunder Client (VS Code extension)

Import the API collection or manually test the endpoints using the documentation above.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.