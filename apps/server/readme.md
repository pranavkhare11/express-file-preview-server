# Express File Preview Server

A production-grade, modular Node.js Express backend featuring JWT authentication with Redis session tracking, Google Drive backend storage, FFmpeg video optimization with `-movflags +faststart`, HTTP 206 Byte-Range streaming, disk-based zero-RAM upload streaming, transcode concurrency queuing, network retry streaming cutoffs, and real-time Server-Sent Events (SSE).

---

## ✨ Features

- **Feature-Based Modular Architecture**: Organized into clean `src/features/` modules (`auth`, `admin`, `files`) following modern enterprise standards.
- **Authentication & Security**:
  - Bcrypt password hashing (`cost factor 12`).
  - JWT token issuance with UUID session tracking (`jti`).
  - Instant session revocation via Redis denylisting.
  - Express middleware protection for all routes including SSE streams.
- **Google Drive Storage & Media Management**:
  - **Google Drive Central Backend**: Direct streaming to user-isolated folders on Google Drive.
  - **Zero-RAM Disk Storage**: Multer disk streaming (`src/features/files/middlewares/upload.middleware.js`) prevents memory exhaustion during multi-GB uploads.
  - **Type & Size Validation**:
    - 📹 Videos: up to **10 GB**
    - 🎵 Audio: up to **100 MB**
    - 📄 Images/Documents: up to **5 MB**
  - **Asynchronous Video Optimization & Queueing**: FFmpeg fast-start remuxing (`-movflags +faststart`) with a 2-job concurrency queue and 5% progress throttled database updates.
  - **HTTP 206 Byte-Range Streaming**: Fast video/audio seeking directly from Google Drive CDN streams with 15s/30s network timeout and automated retry handling.
- **Enterprise System Reliability**:
  - **Global Error Handler**: Centralized error middleware ([`src/middlewares/errorMiddleware.js`](file:///c:/Users/khare/Desktop/Repos/express-file-preview-server/src/middlewares/errorMiddleware.js)).
  - **Graceful Shutdown**: `SIGTERM` and `SIGINT` signal handling in [`server.js`](file:///c:/Users/khare/Desktop/Repos/express-file-preview-server/server.js) for clean database and Redis teardown.
  - **Startup Sweep**: Automatic cleanup of orphaned local temp files and stale `processing` documents upon process restart.
  - **Automated Unit Testing**: Integrated Node.js test runner suite (`pnpm test`).
- **Dashboard & Real-Time Monitoring**:
  - SSE (Server-Sent Events) live ticker for admin metrics & file processing progress.
  - Frontend dashboard with upload progress bar, transcoding indicators, and media preview modal.

---

## 📁 Directory Structure

```text
express-file-preview-server/
├── src/
│   ├── config/
│   │   ├── constants.js                  # Centralized limits, keys, MIME types, and paths
│   │   └── db.js                         # MongoDB & Redis client connections with teardown
│   ├── services/
│   │   ├── jwtService.js                 # Token signing, verification, and decoding
│   │   └── sessionService.js             # Redis session tracking, stats, purge, and SSE broadcast
│   ├── middlewares/
│   │   ├── authMiddleware.js             # JWT authorization & admin access control
│   │   ├── errorMiddleware.js            # Global error handler middleware
│   │   └── loggerMiddleware.js           # Request timing & HTTP logger
│   ├── features/
│   │   ├── auth/                         # User Authentication Feature Module
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.router.js
│   │   │   ├── auth.service.js
│   │   │   ├── auth.validation.js
│   │   │   └── user.model.js
│   │   ├── admin/                        # System Administration Feature Module
│   │   │   ├── admin.controller.js
│   │   │   ├── admin.router.js
│   │   │   ├── admin.service.js
│   │   │   └── admin.validation.js
│   │   └── files/                        # File & Media Management Feature Module
│   │       ├── file.controller.js
│   │       ├── file.model.js
│   │       ├── file.router.js
│   │       ├── file.service.js
│   │       ├── middlewares/
│   │       │   ├── file.validation.js    # File size & extension validation
│   │       │   └── upload.middleware.js  # Multer diskStorage configuration
│   │       └── services/
│   │           ├── drive.service.js      # Google Drive API provider with retry & timeouts
│   │           └── video.service.js      # FFmpeg video transcoding queue
│   └── app.js                            # Express app initialization & route assembly
├── tests/                                # Automated Unit Test Suite (Node test runner)
│   ├── constants.test.js
│   └── jwtService.test.js
├── public/                               # Client frontend dashboard & admin interface
├── scripts/                              # Utility scripts (OAuth refresh token generator)
├── docker-compose.yml                    # Local MongoDB & Redis containers with healthchecks
├── .env.example                          # Environment variables template
└── server.js                             # Root Express entry point & shutdown handler
```

---

## ⚙️ Prerequisites

- **Node.js**: `v18+`
- **pnpm**: `v9+`
- **Docker Desktop**: (for local MongoDB & Redis services)

---

## 🚀 Quick Start

1. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```

2. **Install Dependencies**:
   ```bash
   pnpm install
   ```

3. **Run Unit Tests**:
   ```bash
   pnpm test
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
| `GET` | `/api/files/:id/preview` | Bearer / Query | Stream/preview file (supports Range 206) |
| `GET` | `/api/files/:id/download` | Bearer / Query | Download original file |
| `DELETE` | `/api/files/:id` | Bearer | Delete file from Google Drive & database |

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
ADMIN_PASSWORD=ChangeThisToASecurePasswordInProd!123

GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REFRESH_TOKEN=your_google_refresh_token_here
GOOGLE_DRIVE_FOLDER_ID=
```