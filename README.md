# Nestora Backend API

Production-quality Node.js, Express.js, and MongoDB backend application providing JWT and Cookie-based Authentication and User Account Services for the **Nestora** Architectural Living e-commerce platform.

---

## 🏗️ Architecture & Project Structure

```
backend/
├── src/
│   ├── config/          # Database, Environment, & Passport configurations
│   ├── controllers/     # Thin HTTP Controllers
│   ├── middleware/      # Auth JWT verification, Error Handler, Validation
│   ├── models/          # Mongoose User and Address Schemas
│   ├── routes/          # Express Routers (/api/auth & /api/users)
│   ├── services/        # Decoupled Business Logic Layer
│   ├── utils/           # JWT Tokens & Bcrypt Password Hashing
│   ├── validators/      # Payload & Input Validation Rules
│   ├── app.js           # Express App Configuration (Security, CORS, Middlewares)
│   └── server.js        # Server Entry Point & DB Initialization
├── .env                 # Environment secrets (Git-ignored)
├── .env.example         # Environment template
├── package.json
└── README.md
```

---

## ⚡ Setup & Environment Variables

1. Navigate to the backend directory:
   ```bash
   cd nestora/backend
   ```

2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. Configure environment variables in `.env`:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGO_URI=mongodb://127.0.0.1:27017/nestora
   JWT_SECRET=nestora_super_secret_jwt_key_2026_dev_env
   JWT_EXPIRES_IN=7d
   GOOGLE_CLIENT_ID=your_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_google_client_secret_here
   GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
   FRONTEND_URL=http://localhost:5173
   ```

---

## 🚀 Running the Server

### Development Mode (with Nodemon):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

---

## 📡 API Endpoints

### 🩺 Health Check
- `GET /api/health` — API health status

### 🔐 Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new account
- `POST /api/auth/login` — Sign in with email and password
- `POST /api/auth/google` — Authenticate via Google OAuth token/identity
- `POST /api/auth/logout` — Clear HttpOnly authentication cookie
- `GET  /api/auth/me` — Fetch currently authenticated user profile
- `POST /api/auth/forgot-password` — Request password reset email
- `POST /api/auth/reset-password` — Reset password using token
- `POST /api/auth/verify-email` — Verify user email address
- `POST /api/auth/resend-verification` — Resend email verification link

### 👤 User Profile (`/api/users`)
- `GET /api/users/profile` — Fetch profile details (Protected)
- `PUT /api/users/profile` — Update user profile details (Protected)

---

## 🔐 Security Features

- **Bcrypt Password Hashing**: Passwords are standardly hashed prior to persistence.
- **HttpOnly Secure Cookies**: JWT tokens stored securely to mitigate XSS attacks.
- **Helmet Security Headers**: Protection against common web vulnerabilities.
- **Strict CORS Policy**: Restricted to configured `FRONTEND_URL` with credentials support.
- **Rate Limiting**: IP rate limiting to prevent brute force attacks.
- **Decoupled API Architecture**: Zero exposed secrets or direct database access on frontend.
