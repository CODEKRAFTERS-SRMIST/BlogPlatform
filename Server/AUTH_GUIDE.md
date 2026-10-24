# Authentication System Implementation Guide

## 🔐 Complete Authentication Flow

### Registration → Approval → Password Setup → Login

```
User Register → [pending] → Admin Approves → Email with Token → User Sets Password → [approved] → User Logs In
```

---

## 📡 API Endpoints

### **User Endpoints**

#### 1. **POST /api/users/register**
Register new user with pending status
```bash
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","reg_no":"2024CS001","year":"3rd","domain":"Web Dev"}'
```

Response: `{ user: { id, email, ref_code: "SC-ABC123XYZ9", status: "pending" } }`

#### 2. **POST /api/users/set-password**
Set password using token from email
```bash
curl -X POST http://localhost:5000/api/users/set-password \
  -H "Content-Type: application/json" \
  -d '{"token":"your-64-char-token","password":"SecurePass123!"}'
```

### **Auth Endpoints**

#### 3. **POST /api/auth/login**
Login and get JWT token
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"SecurePass123!"}'
```

Response: `{ token: "jwt...", user: { id, email, name, role } }`

#### 4. **GET /api/auth/me**
Get current user (requires auth)
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 5. **POST /api/auth/logout**
Logout (clears cookie if enabled)
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **Admin Endpoints**

#### 6. **GET /api/admin/users/pending**
List pending users (admin only)
```bash
curl -X GET http://localhost:5000/api/admin/users/pending \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

#### 7. **PATCH /api/admin/users/:id/approve**
Approve user → sends email with password setup link (admin only)
```bash
curl -X PATCH http://localhost:5000/api/admin/users/USER_ID/approve \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## 🔧 Environment Variables (.env)

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/blogdb?schema=public"

# JWT (min 32 chars)
JWT_SECRET="your-super-secret-jwt-key-at-least-32-characters-long"

# Email (Gmail example)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-gmail-app-password"

# Server
PORT=5000
NODE_ENV=development

# URLs
FRONTEND_URL="http://localhost:3000"
APP_URL="http://localhost:3000"

# Required - the browser authenticates by cookie, so without this you can
# log in and then be treated as signed out on every page after it.
USE_COOKIES=true

# Optional
ADMIN_EMAIL="admin@example.com"
```

**Gmail App Password Setup:**
1. Enable 2FA on Google Account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use 16-char password as EMAIL_PASS

---

## 🗄️ Database Schema Updates

```prisma
model User {
  id                     String    @id @default(uuid())
  name                   String
  email                  String    @unique
  reg_no                 String
  year                   String
  domain                 String
  ref_code               String    @unique
  status                 String    @default("pending")
  password_hash          String?
  role                   String    @default("member")
  set_password_token     String?   @unique      // NEW
  set_password_expires   DateTime?              // NEW
  created_at             DateTime  @default(now())
  updated_at             DateTime  @updatedAt   // NEW
  blogs                  Blog[]
}
```

**Run migrations:**
```bash
npx prisma generate
npx prisma db push
```

---

## 🛠️ JWT Middleware Usage

### Basic Authentication
```javascript
import { authenticate } from "../middleware/auth.js";

router.get("/protected", authenticate, (req, res) => {
  console.log(req.user); // { id, role, email }
  res.json({ user: req.user });
});
```

### Role-Based Access
```javascript
import { authenticate, requireRole } from "../middleware/auth.js";

// Admin only
router.get("/admin-only", authenticate, requireRole('admin'), handler);

// Multiple roles
router.get("/staff", authenticate, requireRole(['admin', 'moderator']), handler);
```

### Manual Role Check
```javascript
router.post("/something", authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: "Admin access required" });
  }
  // ... handler code
});
```

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp env.example .env
# Edit .env with your credentials

# 3. Setup database
npx prisma generate
npx prisma db push

# 4. Create admin user (run seed script)
node src/scripts/seed-admin.js

# 5. Start server
npm run dev
```

---

## 📋 Complete Test Flow

### 1. Register User
```bash
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "reg_no": "2024CS002",
    "year": "2nd",
    "domain": "AI/ML"
  }'
```
**Note the ref_code from response**

### 2. Admin Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'
```
**Save admin token**

### 3. List Pending Users
```bash
curl -X GET http://localhost:5000/api/admin/users/pending \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

### 4. Approve User
```bash
curl -X PATCH http://localhost:5000/api/admin/users/USER_ID_HERE/approve \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```
**User receives email with token**

### 5. Set Password (User)
```bash
curl -X POST http://localhost:5000/api/users/set-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN_FROM_EMAIL",
    "password": "SecurePass123!"
  }'
```

### 6. Login (User)
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "SecurePass123!"
  }'
```
**Save user token**

### 7. Access Protected Route
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer USER_TOKEN_HERE"
```

---

## 🔒 Security Features

✅ **Passwords**: Bcrypt hashing (12 rounds)  
✅ **JWT**: Signed tokens with 7-day expiry  
✅ **Tokens**: One-time use, 24-hour expiry  
✅ **Validation**: Input validation on all endpoints  
✅ **CORS**: Configured for specific frontend  
✅ **Cookies**: Optional HttpOnly cookies (XSS protection)  
✅ **Error Messages**: Generic messages prevent enumeration  

---

## 🐛 Common Issues

### "Invalid token" error
- Token expired (24 hours for password setup, 7 days for JWT)
- Token malformed or incomplete
- JWT_SECRET mismatch

### "Email already registered"
- User already exists in database
- Check with different email

### Email not sending
- Verify EMAIL_* environment variables
- Use Gmail app password (not regular password)
- Check spam folder

### "Account not approved"
- Admin hasn't approved user yet
- Status must be 'approved' to login

---

## 📦 Dependencies Required

```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "dotenv": "^16.0.0",
  "jsonwebtoken": "^9.0.0",
  "bcrypt": "^5.1.0",
  "nodemailer": "^6.9.1",
  "cookie-parser": "^1.4.6",
  "@prisma/client": "^5.0.0",
  "prisma": "^5.0.0"
}
```

All dependencies already added to package.json ✅
