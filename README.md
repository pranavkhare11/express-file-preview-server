# 🔴 Express File Preview Server

> **High-Performance Virtual File System (VFS), Byte-Range Media Streaming Engine & Cloud File Management Server with a Nothing OS Aesthetic Interface.**

[![Node.js](https://img.shields.io/badge/Node.js-v24.x-brightgreen.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v4.19-blue.svg)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-v19.x-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v6.0-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-v8.2-646cff.svg)](https://vitejs.dev/)
[![styled-components](https://img.shields.io/badge/styled--components-v6.5-db7093.svg)](https://styled-components.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-v8.x-47A248.svg)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-v6.x-DC382D.svg)](https://redis.io/)

---

## 🌟 Overview

**Express File Preview Server** is a monorepo cloud file management platform built with modern web standards. It combines an Express.js backend for high-throughput media streaming and virtual file hierarchy management with a React frontend styled after the distinct **Nothing OS (NDOT)** design language.

---

## ✨ Core Features

### 🖥️ Nothing OS Cyberpunk Interface
- **Monochrome & Dot-Matrix Design**: Clean, pitch-black (`#000000`) high-contrast dark theme utilizing `Space Mono` typography and dynamic crimson red (`#D71921`) LED indicators.
- **Glassmorphic UI Widgets**: High-tech dashboard widgets, floating command bars, smooth glowing micro-interactions, and modal dialogs.
- **100% Fluid Layout**: Full-width widescreen viewport optimized for complex desktop file management workflows.

### 📁 Virtual File System (VFS)
- **Hierarchical Directory Tree**: Nested folder organization with interactive breadcrumb navigation and path resolution.
- **Collision Management**: Automatic duplicate detection with auto-incrementing naming (e.g., `report (1).pdf`).
- **Zero-Copy Virtual Duplication (`vCopy`)**: Instant file copying using reference-counted storage layers without redundant physical storage consumption.
- **Full File Management**: Multi-select drag & drop uploading, inline file/folder renaming, structural folder deletion, and clipboard hotkeys (`Ctrl+C`, `Ctrl+X`, `Ctrl+V`, `Delete`).

### 🎬 Byte-Range Media Streaming & Faststart
- **HTTP 206 Partial Content Streaming**: Native low-latency seeking for audio (`MP3`, `WAV`, `OGG`), video (`MP4`, `MKV`, `MOV`, `WebM`, `AVI`), `PDF` documents, and high-resolution images.
- **FFmpeg Atom Relocation**: Automatic relocation of `moov` atoms to the beginning of MP4/video files for instant video playback without downloading the full container.

### 🔒 Dual-Token HttpOnly Auth & Security
- **Secure Token Lifecycle**: Short-lived Access Token (15 min) + 7-Day Refresh Token transmitted via secure `HttpOnly`, `SameSite=Lax` cookies.
- **Silent Background Token Rotation**: Automatic token refresh cycle (`POST /api/refresh`) preventing session expiration interruptions.
- **Redis Revocation & Session Denylist**: Global and per-session instant revocation storing invalidated tokens in Redis.

### 🛡️ Privacy-First Admin Telemetry
- **System Metrics Dashboard**: Aggregate telemetry showing active user sessions, global storage footprint, mime-type distributions, and system health.
- **Privacy Enforcement**: Strict role-based isolation ensuring administrators can monitor system load and revoke sessions without visibility into user private files or file metadata.

### ☁️ Hybrid Cloud Storage
- **Google Drive Central Storage**: Background sync to Google Drive storage while retaining sub-millisecond local VFS index queries in MongoDB.

---

## 🏗️ Architecture & Monorepo Structure

```
express-file-preview-server/
├── apps/
│   ├── client/                  # Frontend Application (@preview/client)
│   │   ├── src/
│   │   │   ├── components/      # Glassmorphic Nothing OS UI Components
│   │   │   ├── contexts/        # Auth, VFS, and Stream State Contexts
│   │   │   ├── pages/           # Auth, Explorer, App Launcher, & Admin Pages
│   │   │   ├── styles/          # Styled-Components Theme Tokens & Global CSS
│   │   │   ├── App.tsx          # Main Router & Layout Entrypoint
│   │   │   └── main.tsx         # React 19 Client Hydration
│   │   ├── index.html
│   │   ├── vite.config.ts       # Vite Dev Server Config & Proxy Settings
│   │   └── package.json
│   │
│   └── server/                  # Backend API Server (@preview/server)
│       ├── src/
│       │   ├── config/          # Environment variables & constants
│       │   ├── features/        # Auth, Admin, and File Feature Modules
│       │   │   ├── admin/       # Privacy-first admin telemetry & session control
│       │   │   ├── auth/        # JWT, User Model, Cookie Auth Controllers
│       │   │   └── files/       # VFS logic, Multer upload, Stream Controllers
│       │   ├── middlewares/     # AuthGuard, AdminGuard, Logger, Error Handler
│       │   ├── services/        # Redis, Google Drive API, FFmpeg stream services
│       │   └── app.js           # Express App Configuration
│       ├── tests/               # Backend Unit & Integration Tests
│       ├── docker-compose.yml   # MongoDB & Redis Service Setup
│       ├── server.js            # Node 24 HTTP Server Launcher
│       └── package.json
│
├── package.json                 # Monorepo Workspace Configuration
├── pnpm-workspace.yaml          # pnpm Workspace definition
└── README.md
```

---

## 🛠️ Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 19, Vite 8, TypeScript 6 |
| **Styling & Design** | `styled-components` v6, Space Mono Typography, Glassmorphism, Nothing OS Palette |
| **Backend Runtime** | Node.js v24+, Express.js v4.19 |
| **Database & Cache** | MongoDB (Mongoose v9), Redis (Session Denylist & Cache) |
| **Media Processing** | FFmpeg (`ffmpeg-static`, `fluent-ffmpeg`), Multer |
| **Cloud & Services** | Google Drive API (`googleapis`) |
| **Package Management** | `pnpm` Workspaces, Docker Compose |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** `v20.x` or higher (v24 recommended)
- **pnpm** `v9.x` or higher (`npm install -g pnpm`)
- **Docker Desktop / Docker CLI** (for local MongoDB & Redis instances)

### 1. Installation
Clone the repository and install dependencies across all workspace apps:
```bash
git clone https://github.com/pranavkhare11/express-file-preview-server.git
cd express-file-preview-server
pnpm install
```

### 2. Environment Configuration
Create an `.env` file inside `apps/server/` based on `.env.example`:

```bash
cp apps/server/.env.example apps/server/.env
```

**`apps/server/.env`**:
```env
# Server Configuration
PORT=3000
HOST=0.0.0.0

# Security & Authentication
JWT_SECRET=your_super_secret_jwt_key_here

# Databases
MONGO_URI=mongodb://127.0.0.1:27017/encrypt_creds_db
REDIS_URI=redis://127.0.0.1:6379

# Initial Administrator Seed Credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin@123456

# Google Drive Storage Credentials (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_google_refresh_token
GOOGLE_DRIVE_FOLDER_ID=
```

### 3. Start Database Infrastructure
Launch MongoDB and Redis containers via Docker Compose:
```bash
docker compose -f apps/server/docker-compose.yml up -d
```

### 4. Run Development Environment
Run both backend and frontend applications concurrently:
```bash
pnpm dev
```
- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- **Backend API Server**: [http://localhost:3000](http://localhost:3000)

---

## 📜 Available Scripts

From the repository root, you can run:

| Command | Action |
| :--- | :--- |
| `pnpm dev` | Start both Express server and Vite React client concurrently. |
| `pnpm dev:server` | Start the Express backend with live reload (`node --watch`). |
| `pnpm dev:client` | Start the Vite frontend development server. |
| `pnpm test` | Run backend unit tests using Node.js native test runner. |
| `pnpm --filter @preview/client build` | Perform TypeScript type-checks and produce a production Vite build. |

---

## 📡 API Reference Overview

### Authentication (`/api`)
- `POST /api/register` - Create a new user account.
- `POST /api/login` - Authenticate user & issue HttpOnly JWT cookies.
- `POST /api/refresh` - Silently refresh short-lived Access Token.
- `POST /api/logout` - Invalidate session tokens in Redis & clear cookies.
- `GET /api/me` - Fetch currently authenticated user profile.
- `DELETE /api/account` - Permanently delete account and all associated VFS files.

### Virtual File System & Streaming (`/api/files`)
- `GET /api/files?folderId=<id>` - List VFS files and folders within directory.
- `POST /api/files/upload` - Upload file(s) with Multer & FFmpeg faststart.
- `POST /api/files/folder` - Create a new VFS directory.
- `GET /api/files/stream/:fileId` - Stream media content with HTTP 206 range support.
- `POST /api/files/copy` - Perform zero-copy virtual duplication (`vCopy`).
- `POST /api/files/move` - Move files/folders across VFS directories.
- `PATCH /api/files/:id/rename` - Rename file or directory.
- `DELETE /api/files/:id` - Delete file or recursively remove directory tree.

### Privacy-First Admin Panel (`/api/admin`)
- `GET /api/admin/metrics` - Fetch anonymized system storage & active session counts.
- `GET /api/admin/sessions` - List active user session IDs & user agents.
- `DELETE /api/admin/sessions/:sessionId` - Force-revoke specific user session via Redis.

---

## 🔑 Default Seed Administrator

Upon initial backend launch with Docker, a default administrator is seeded automatically:
- **Email**: `admin@example.com`
- **Password**: `Admin@123456`

---

## 📄 License
This project is open-source under the [ISC License](LICENSE).
