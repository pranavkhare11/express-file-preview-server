# Authentication & Session Management System Documentation

## Executive Summary & Architecture Overview

This repository (`Backend/4.encrypt-creds`) implements a modern, production-ready authentication and session management architecture built with **Express.js**, **Node.js**, **MongoDB (Mongoose)**, and **Redis**. 

Infrastructure dependencies (MongoDB & Redis) are fully containerized using **Docker Compose** (`docker-compose.yml`), enabling a zero-configuration local development environment.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXPRESS SERVER (server.js)                        │
├──────────────────────────────────────┬──────────────────────────────────────┤
│          MONGODB (Data Store)        │          REDIS (Transient Store)     │
│   - Users Collection (Mongoose)      │   - Token Denylist (JTI + TTL)       │
│   - Hashed Passwords (bcrypt cost 12)│   - User Active Sessions Sets (Ph. 2)│
│   - Unique Email Indexes             │   - Global Session Index (Ph. 3)     │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

---

## Evolution Roadmap

| Phase | Title | Scope & Capabilities | Status |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Single Token Revocation** | Server-side single logout using JWT `jti` denylisting with Redis TTL. | **Completed & Hardened** |
| **Phase 2** | **Multi-Device Control** | User manages active logins across multiple devices/browsers. | **Architected** |
| **Phase 3** | **Global Admin Session Control** | Admin dashboard, system-wide session table, & emergency kill switch. | **Architected** |

---

## Phase 1: Implementation & Security Hardening (Current Codebase)

### 1. Database & Infrastructure Setup
- **MongoDB Model (`User`)**:
  - `name`: Required string.
  - `email`: Required, unique, lowercased string.
  - `hashedPassword`: Bcrypt hash (salted with 12 rounds).
  - `timestamps`: Automatic `createdAt` and `updatedAt`.
- **Redis Client**:
  - Attached non-blocking error handler (`redisClient.on('error', ...)`).
  - Connection gated alongside MongoDB inside `startServer()` using `Promise.all()`.
- **Docker Compose (`docker-compose.yml`)**:
  - Service `mongodb`: Mongo container listening on `27017`.
  - Service `redis`: Redis Alpine container listening on `6379`.
- **Package Lifecycles (`package.json`)**:
  - `"predev": "docker compose up -d"` automatically provisions database containers when running `pnpm dev`.

### 2. Token Specification & Revocation Logic
- Every JWT token issued during Signup or Signin contains a unique cryptographic UUID `jti` claim (`jwtid: crypto.randomUUID()`).
- On `/api/logout` or account deletion (`DELETE /api/user`), the server executes `revokeToken(jti, exp)`:
  1. Computes remaining token lifetime: `remainingSeconds = exp - Math.floor(Date.now() / 1000)`.
  2. Saves `denylist:<jti>` into Redis with `setEx(key, remainingSeconds, 'revoked')`.
  3. Redis automatically expires and cleans up the key when the JWT naturally dies, preventing unbounded memory growth.

### 3. Endpoints Implemented in Phase 1

| Method | Route | Description | Validation & Security |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/signup` | Register new user account | Atomic `E11000` duplicate catch, email regex validation, 6-char password minimum, string trimming. |
| `POST` | `/api/signin` | Authenticate existing user | Credential verification, email trimming/lowercasing, issues 1h JWT with `jti`. |
| `POST` | `/api/logout` | Revoke active token | Extract `jti` & `exp`, calls `revokeToken()`, returns `200 OK`. |
| `GET` | `/api/user` | Fetch current user profile | Protected by `authenticateToken`, primary key lookup (`User.findById`). |
| `DELETE`| `/api/user` | Delete user account | Desktop-only middleware check, deletes user document, revokes current token. |
| `POST` | `/api/test-content/length` | Content length test | Validates max 10 characters, returns `413 Content Too Large` on breach. |
| `POST` | `/api/test-content/size` | Content byte size test | Validates max 20 bytes (`Buffer.byteLength`), returns `413 Content Too Large` on breach. |

### 4. Middleware & Middleware Protection
- **`authenticateToken`**:
  - Enforces strict `Authorization: Bearer <token>` format.
  - Verifies JWT signature against `JWT_SECRET`.
  - Performs asynchronous Redis denylist check `redisClient.get('denylist:' + jti)` wrapped in error handlers.
- **`desktopOnly`**:
  - User-Agent UX gate verifying desktop operating systems before sensitive operations.
- **`startServer()` Connection Gate**:
  - Defers `app.listen(port)` until both MongoDB and Redis connections are established.

---

## Phase 2: Multi-Device Session Management (Design & Specs)

### Objective
Allow users to be logged in concurrently across multiple devices (e.g., Chrome on Windows, Safari on iPhone, Firefox on macOS), view all active sessions, and logout of specific or all devices.

### Redis Data Structures for Phase 2
1. **User Active Sessions Index (`SET`)**:
   - Redis Key: `user_sessions:<userId>` -> Array of active `jti`s.
2. **Session Metadata (`HASH` / `STRING`)**:
   - Redis Key: `session_meta:<jti>` -> Stores `deviceName`, `ipAddress`, `createdAt`, `exp`.

### Phase 2 Endpoints Specs

```javascript
// 1. GET /api/sessions -> Returns list of user's active devices
app.get('/api/sessions', authenticateToken, async (req, res) => {
    const jtis = await redisClient.sMembers(`user_sessions:${req.user.userId}`);
    const sessions = [];
    for (const jti of jtis) {
        const metaJson = await redisClient.get(`session_meta:${jti}`);
        if (metaJson) {
            sessions.push({ ...JSON.parse(metaJson), isCurrent: jti === req.user.jti });
        }
    }
    res.json({ sessions });
});

// 2. POST /api/sessions/revoke -> Revoke a specific device
app.post('/api/sessions/revoke', authenticateToken, async (req, res) => {
    const { targetJti } = req.body;
    const metaJson = await redisClient.get(`session_meta:${targetJti}`);
    if (metaJson) {
        const { exp } = JSON.parse(metaJson);
        await revokeToken(targetJti, exp);
        await redisClient.sRem(`user_sessions:${req.user.userId}`, targetJti);
        await redisClient.del(`session_meta:${targetJti}`);
    }
    res.json({ message: "Device session revoked successfully" });
});

// 3. POST /api/sessions/logout-all-others -> Revoke all except current
app.post('/api/sessions/logout-all-others', authenticateToken, async (req, res) => {
    const currentJti = req.user.jti;
    const jtis = await redisClient.sMembers(`user_sessions:${req.user.userId}`);
    for (const jti of jtis) {
        if (jti !== currentJti) {
            const metaJson = await redisClient.get(`session_meta:${jti}`);
            if (metaJson) {
                const { exp } = JSON.parse(metaJson);
                await revokeToken(jti, exp);
                await redisClient.del(`session_meta:${jti}`);
            }
            await redisClient.sRem(`user_sessions:${req.user.userId}`, jti);
        }
    }
    res.json({ message: "Logged out of all other devices" });
});
```

---

## Phase 3: Global Admin Session Control (Design & Specs)

### Objective
System-wide administration control panel allowing admins to monitor platform metrics, view all active user sessions system-wide, force logout targeted users, or trigger an emergency platform-wide purge.

### Key Components for Phase 3
1. **Role-Based Access Control (RBAC)**:
   - User document contains `role: 'user' | 'admin'`.
   - `requireAdmin` middleware checks `req.user.role === 'admin'`.
2. **Global Session Tracking (`SET`)**:
   - Redis Key: `global_sessions` -> Contains all active `jti`s across the entire application.

### Phase 3 Endpoints Specs

| Route | Access | Description |
| :--- | :--- | :--- |
| `POST /api/admin/signin` | Public | Admin login, issues JWT with `{ role: 'admin' }`. |
| `GET /api/admin/stats` | Admin Only | Returns total users, active sessions count, and revoked tokens count. |
| `GET /api/admin/sessions` | Admin Only | System-wide active sessions list grouped by user email/ID. |
| `POST /api/admin/users/:userId/logout-all` | Admin Only | Forces logout of all active sessions for a target user. |
| `POST /api/admin/sessions/purge-system` | Admin Only | Emergency kill switch revoking all active platform sessions. |

```javascript
// Emergency Platform-Wide Purge
app.post('/api/admin/sessions/purge-system', authenticateToken, requireAdmin, async (req, res) => {
    const globalJtis = await redisClient.sMembers('global_sessions');
    for (const jti of globalJtis) {
        const metaJson = await redisClient.get(`session_meta:${jti}`);
        if (metaJson) {
            const { exp, userId } = JSON.parse(metaJson);
            await revokeToken(jti, exp);
            await redisClient.del(`session_meta:${jti}`);
            await redisClient.del(`user_sessions:${userId}`);
        }
        await redisClient.sRem('global_sessions', jti);
    }
    res.json({ message: "Emergency system purge complete. All active sessions invalidated." });
});
```

---

## Developer Guide & Quickstart Commands

### 1. Environment File (`.env`)
```env
PORT=3000
JWT_SECRET=bhandara_karado_babuji
MONGO_URI=mongodb://127.0.0.1:27017/encrypt_creds_db
REDIS_URI=redis://127.0.0.1:6379
```

### 2. Launch Development Server
```bash
# Automatically spins up Docker containers (MongoDB & Redis) and launches Node in watch mode
pnpm dev
```

### 3. Manual Container Management
```bash
# Start MongoDB & Redis containers manually
docker compose up -d

# Check container status
docker compose ps

# Stop containers
docker compose down
```

---

## Verification & Testing Procedure

### Testing Server-Side Logout (Revocation Verification)
1. Open `http://localhost:3000/index.html` and sign in.
2. Open DevTools Console (`F12`) and copy the token:
   ```javascript
   console.log(localStorage.getItem('token'));
   ```
3. Click **Sign Out** on `dashboard.html`. Server logs show `⏳ [LOGOUT REVOKE]` and `✅ [LOGOUT SUCCESS]`.
4. On `index.html`, re-inject the saved token in DevTools console:
   ```javascript
   localStorage.setItem('token', 'PASTE_COPIED_TOKEN');
   ```
5. Navigate back to `http://localhost:3000/dashboard.html`.
6. **Result**: Server logs `🚫 [AUTH FAILED] Token is revoked`, returns `401 Unauthorized`, and redirects immediately back to `index.html`.
