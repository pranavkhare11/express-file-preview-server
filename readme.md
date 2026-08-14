# Express File Preview Server

A production-grade, modular Node.js Express backend featuring JWT authentication with Redis session tracking, user-isolated file management, FFmpeg video optimization with `-movflags +faststart`, HTTP 206 Byte-Range streaming, and real-time Server-Sent Events (SSE).

---

## ✨ Features

- **Modular Architecture**: Layered Express MVC design (Config, Models, Services, Middlewares, Controllers, Routes).
- **Authentication & Security**:
  - Bcrypt password hashing (`cost factor 12`).
  - JWT token issuance with UUID session tracking (`jti`).
  - Instant session revocation via Redis denylisting.
- **Media & File Management**:
  - **User-Isolated Storage**: Automated creation of per-user storage (`uploads/<userId>/`).
  - **Unique Naming**: File naming formatted as `username-UUID.ext`.
  - **Type & Size Validation**:
    - 📹 Videos: up to **10 GB**
    - 🎵 Audio: up to **100 MB**
    - 📄 Images/Documents: up to **5 MB**
  - **Asynchronous Video Optimization**: FFmpeg fast-start remuxing (`-movflags +faststart`) for instant web video streaming without preloading.
  - **HTTP 206 Byte-Range Streaming**: Seeking and chunked video/audio playback.
- **Dashboard & Real-Time Monitoring**:
  - SSE (Server-Sent Events) live ticker for admin state & file progress.
  - Frontend dashboard with network upload progress bar, transcoding indicators, and media preview modal.

---

## 📁 Directory Structure

```text
Backend/4.encrypt-creds/
├── config/
│   └── db.js                  # MongoDB & Redis client connections
├── models/
│   ├── User.js                # Mongoose User model & seedAdmin helper
│   └── File.js                # Mongoose File model & status tracking
├── services/
│   ├── sessionService.js      # Redis session management & SSE broadcasting
│   └── videoService.js        # FFmpeg zero-reencode fast-start transcoder
├── middlewares/
│   ├── authMiddleware.js      # JWT verification & admin authorization
│   ├── loggerMiddleware.js    # HTTP request duration logging
│   └── uploadMiddleware.js    # Multer configuration & file validation
├── controllers/
│   ├── authController.js      # Signup, Signin, Profile, Logout, Delete Account
│   ├── adminController.js     # Admin Auth, Stats, Sessions, Revoke, Purge, SSE
│   └── fileController.js      # Upload, List, Preview, Download, Delete
├── routes/
│   ├── authRoutes.js          # /api user authentication routes
│   ├── adminRoutes.js         # /api/admin management routes
│   └── fileRoutes.js          # /api/files media management routes
├── public/                    # Frontend client files (Dashboard, Admin, Auth)
├── docker-compose.yml         # Local MongoDB & Redis containers
├── pnpm-workspace.yaml        # PNPM build approval configuration
├── .env.example               # Environment variables template
└── server.js                  # Main Express entry point
```

---

## ⚙️ Prerequisites

- **Node.js**: `v18+`
- **pnpm**: `v9+`
- **Docker Desktop**: (for local MongoDB & Redis services)

---

## 🚀 Quick Start

1. **Clone the Repository & Navigate to Directory**:
   ```bash
   cd Backend/4.encrypt-creds
   ```

2. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```

3. **Install Dependencies**:
   ```bash
   pnpm install
   ```

4. **Start local Databases & Development Server**:
   ```bash
   pnpm dev
   ```

5. **Access Application**:
   - Web App: `http://localhost:3000`
   - Admin Panel: `http://localhost:3000/admin.html`

---

## 🔗 API Endpoints

### 🔐 User Authentication (`/api`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/signup` | Public | Register new user account |
| `POST` | `/api/signin` | Public | Authenticate user & issue JWT |
| `GET` | `/api/user` | Bearer | Retrieve user profile |
| `POST` | `/api/logout` | Bearer | Revoke JWT session token |
| `DELETE` | `/api/user` | Bearer | Delete user account |

### 📁 File Management (`/api/files`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/files/upload` | Bearer | Upload multiple files (field: `files`) |
| `GET` | `/api/files` | Bearer | List files belonging to user |
| `GET` | `/api/files/:id/preview` | Bearer / Token | Stream/preview file (supports Range 206) |
| `GET` | `/api/files/:id/download` | Bearer / Token | Download original file |
| `DELETE` | `/api/files/:id` | Bearer | Delete file from disk & database |

### 🛡️ Admin Management (`/api/admin`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/admin/signin` | Public | Admin authentication |
| `GET` | `/api/admin/stats` | Admin | Get user & session metrics |
| `GET` | `/api/admin/sessions` | Admin | List active global sessions |
| `POST` | `/api/admin/sessions/revoke` | Admin | Revoke specific user session |
| `POST` | `/api/admin/sessions/purge-system` | Admin | Invalidate all user sessions |
| `GET` | `/api/admin/events/sse` | Admin | Real-time SSE event stream |

---

## 🔑 Environment Variables (`.env`)

```env
PORT=3000
JWT_SECRET=your_super_secret_jwt_key_here
MONGO_URI=mongodb://127.0.0.1:27017/encrypt_creds_db
REDIS_URI=redis://127.0.0.1:6379
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin@123456
```