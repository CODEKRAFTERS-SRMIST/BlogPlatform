# 🚀 CodeKrafters Blog Platform

Welcome to the official **CodeKrafters Blog Platform**! This platform serves as a modern, high-fidelity, and secure workspace for club members to share tech insights, tutorials, and project updates. It is designed to integrate seamlessly into the main CodeKrafters Club Website.

### 🌟 What this Web Application is for:
* **📝 Complete Blog Lifecycle:** Write, format, read, update, and delete blog posts using an elegant, editorial-style interface.
* **💬 Interactive Discussions:** An interactive commenting system allowing club members to share feedback, ask questions, and hold discussions directly under articles.
* **❤️ Reaction System:** A clean like/reaction counter on blog articles to engage readers and support authors.
* **🔐 Role-Based Access Control (RBAC):**
  * **Guests:** Browse public articles and read discussions.
  * **Club Members:** Create and publish articles, write comments, update/delete their own content, and customize their profiles.
  * **Admins:** Full platform control including user moderation, member listings, and the authority to delete inappropriate content.
* **📊 Responsive Admin Control Panel:** A personal portal where content creators can view active posts, track metrics, manage published articles, and edit profile details on both desktop and mobile devices.

---

## 🔄 The Blog Publishing & Review Workflow

Here is the simple, step-by-step journey of a blog post on the CodeKrafters platform, from a rough draft to a published article:

```mermaid
graph TD
    Write[1. Writer creates a Draft] -->|Submit for Review| Review[2. Pending Review]
    Review -->|Admin / Reviewer Rejects| Reject[3a. Rejected with Reason]
    Reject -->|Writer updates & resubmits| Review
    Review -->|Admin / Reviewer Approves| Publish[3b. Approved & Published]
    Publish -->|Readers view on main page| Engage[4. Read, Like & Discuss]
    Publish -->|Writers can update| Edit[5. Edit / Refine]
    Publish -->|Writers or Admins can delete| Delete[6. Archive / Delete]
```

### 1. 📝 Step 1: Writing a Draft
* **What happens:** A club member logs in to their dashboard and opens the blog writer tool.
* **Status:** The article is saved as a **Draft**. Only the writer can see or edit it. It is not visible to the public.

### 2. ⏳ Step 2: Submitting for Review
* **What happens:** Once the writer finishes composing their article, they click **Submit for Review**.
* **Status:** The article status changes to **Pending Review**. It is now sent to the club’s review panel (Reviewers and Admins).

### 3. 🔍 Step 3: Admin / Reviewer Moderation (Approval or Rejection)
This is where the editorial panel decides if the article meets the club's guidelines:
* **Option A: Approval ✅**
  * The Admin or Reviewer checks the article, approves it, and clicks **Publish**.
  * **Status:** Changes to **Published**. The article is now live on the main landing feed for the entire campus and public to see.
* **Option B: Rejection ❌**
  * If the article needs changes or doesn't follow guidelines, the reviewer rejects it and leaves a **Rejection Reason** (e.g., "Please fix code formatting in Section 2").
  * **Status:** Changes to **Rejected**. The writer sees the feedback on their dashboard, fixes the issues, and resubmits it back to Step 2.

### 4. 💬 Step 4: Community Reading & Discussion
* **What happens:** Once published, anyone can read the article on the website.
* **Liking:** Readers can click the Like button to show support for the writer.
* **Comments:** Authenticated club members can write comments and start discussions directly at the bottom of the article to share ideas or ask questions.

### 5. ✏️ Step 5: Updating the Article
* **What happens:** If the writer wants to correct a typo or update the code in a live article, they can edit it from their dashboard.
* **Security:** Only the original author or a club Admin is allowed to edit a published post.

### 6. 🗑️ Step 6: Archiving or Deletion
* **What happens:** If a post is no longer relevant, or is flagged for inappropriate content, it can be permanently deleted.
* **Permissions:** Writers can delete their own articles, while club Admins have the authority to moderate and delete any article or comment on the platform to maintain quality.

---

## 🛠️ Technical Architecture

This application splits responsibilities between a client-facing Next.js application and a secure REST API backend.

```mermaid
graph TD
    Client[Next.js Client - Port 3000] -->|Secure Cookies / CORS| API[Express API Server - Port 5000]
    API -->|Prisma Client| DB[(PostgreSQL Database)]
```

### Frontend (Client)
* **Framework:** Next.js (App Router) & TypeScript
* **Styling:** Tailwind CSS & Vanilla CSS
* **Animations:** Hardware-accelerated CSS Keyframes & Framer Motion (optimized for zero GPU overhead)
* **Auth Management:** Axios Interceptors (401-to-refresh silent token rotation flow)

### Backend (Server)
* **Engine:** Node.js & Express
* **Database Access:** Prisma ORM
* **Database:** PostgreSQL
* **Security:** cookie-parser (HttpOnly Cookie Auth), CORS validation, rate-limiter, JWT validation

---

## ✨ Key Features

1. **🎨 Premium Aesthetics & Zero-GPU Performance:**
   * Bespoke typography, dynamic layouts, and hardware-accelerated animations.
   * Completely optimized layout components utilizing layer isolation (`will-change`) and compositor-only CSS transforms for **~0% idle GPU usage** on low-end "potato" devices.

2. **🔒 Multi-Layer Security System:**
   * **SQL Injection Resistant:** Fully parameterized database queries using Prisma.
   * **XSS Sanitization:** Native HTML entity escaping prevents script injection in user comments.
   * **Brute-Force Protection:** Intelligent API rate-limiting blocks dictionary attacks (returning `429 Too Many Requests`).
   * **Cryptographic Sessions:** Tamper-proof session validation using dual-token auto-refresh signatures.

3. **📊 Ergonomic Admin Dashboard:**
   * Secure admin sub-routes.
   * Mobile-responsive layout, user profiles, and content management boards.

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18+)
* **PostgreSQL** instance running locally or hosted.

---

### 1. Server Setup (`/Server`)

1. Navigate to the server folder:
   ```bash
   cd Server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your environment variables. Create a `.env` file:
   ```env
   PORT=5000
   DATABASE_URL="postgresql://user:password@localhost:5432/codekrafters_blog?schema=public"
   JWT_SECRET="your-super-secret-key"
   JWT_REFRESH_SECRET="your-super-refresh-key"
   USE_COOKIES=true
   CORS_ORIGIN="http://localhost:3000"
   ```
4. Run migrations and database seeding:
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```
5. Start the development API server:
   ```bash
   npm run dev
   ```

---

### 2. Client Setup (`/client`)

1. Navigate to the client folder:
   ```bash
   cd ../client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
4. Visit `http://localhost:3000` to view the landing page, and `/login` to access the portal.

---

## 🛡️ API Routes Cheat Sheet

| HTTP Method | Route | Description | Auth Required |
|---|---|---|---|
| **POST** | `/api/auth/register` | Create a member account | None |
| **POST** | `/api/auth/login` | Authenticate & set session cookies | None |
| **POST** | `/api/auth/refresh` | Silent token rotation / session renewal | Cookies |
| **GET** | `/api/blogs` | Fetch all published blog articles | None |
| **POST** | `/api/blogs` | Create a new blog post | Member / Admin |
| **PUT** | `/api/blogs/:id` | Update a blog post (owner only) | Member / Admin |
| **DELETE** | `/api/blogs/:id` | Delete a blog post (owner / admin) | Member / Admin |
| **GET** | `/api/admin/users` | List all registered members | Admin Only |

---

## 🤝 CodeKrafters Club Integration

To merge this platform with the main club portal:
1. **SSO / Shared Cookies:** Ensure both applications are hosted on the same root domain (e.g., `blog.codekrafters.org` and `codekrafters.org`) so authorization cookies are sent securely across subdomains.
2. **Shared Components:** The Navigation Navbar can be unified by copying the client navbar logic into the parent container.
3. **Database Sharing:** Connect your production API to the primary PostgreSQL server by specifying a common Prisma schema.
