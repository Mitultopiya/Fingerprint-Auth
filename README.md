# Fingerprint Authentication System

Production-ready full-stack authentication with **email/password**, **JWT + refresh tokens**, **forgot password**, **role-based access**, and **WebAuthn passkeys** (Touch ID, Face ID, Windows Hello).

## Architecture

```
├── backend/          Express MVC API (Node.js + Prisma + PostgreSQL)
├── frontend/         React + Vite + Tailwind + React Router
└── docker-compose.yml   Local PostgreSQL
```

### Backend (MVC)

| Layer | Responsibility |
|-------|----------------|
| **Routes** | HTTP endpoints, rate limits, validation |
| **Controllers** | Request/response mapping |
| **Services** | Business logic (auth, tokens, WebAuthn, email) |
| **Middleware** | JWT auth, RBAC, Zod validation, errors |
| **Prisma** | PostgreSQL models & queries |

### Security features

- Bcrypt password hashing (configurable rounds)
- Short-lived JWT access tokens + rotating refresh tokens (hashed in DB)
- Helmet, CORS, global + route rate limiting
- Zod input validation
- WebAuthn challenge verification + **counter validation** (clone detection)
- Password reset tokens (SHA-256 hashed, single-use, expiry)
- Generic forgot-password responses (no email enumeration)

---

## Prerequisites

- Node.js 20+
- Docker (optional, for PostgreSQL)
- HTTPS in production (required for WebAuthn on real domains)

---

## Quick start

### 1. Start PostgreSQL

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — set JWT secrets, DATABASE_URL, SMTP (optional)

npm install
npx prisma migrate dev --name init
npm run dev
```

API: `http://localhost:5000/api`

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

App: `http://localhost:5173`

### WebAuthn on localhost

Set in `backend/.env`:

```env
WEBAUTHN_RP_ID=localhost
WEBAUTHN_ORIGIN=http://localhost:5173
CLIENT_URL=http://localhost:5173
```

Use **Chrome/Edge/Safari** on a device with a platform authenticator. Register a passkey from the **Dashboard** after email login.

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Min 32 random chars |
| `JWT_REFRESH_SECRET` | Min 32 random chars |
| `CLIENT_URL` | Frontend URL (CORS) |
| `WEBAUTHN_RP_ID` | Registrable domain (no port), e.g. `auth.example.com` |
| `WEBAUTHN_ORIGIN` | Full origin, e.g. `https://auth.example.com` |
| `SMTP_*` | Nodemailer (optional; logs reset URL if unset) |

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | API base, e.g. `https://api.example.com/api` |

---

## API reference

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Register |
| POST | `/api/auth/login` | — | Login |
| POST | `/api/auth/refresh` | — | Rotate refresh token |
| POST | `/api/auth/logout` | — | Revoke refresh token |
| POST | `/api/auth/forgot-password` | — | Send reset email |
| POST | `/api/auth/reset-password` | — | Reset with token |
| GET | `/api/auth/profile` | JWT | Get profile |
| PATCH | `/api/auth/profile` | JWT | Update profile |
| POST | `/api/auth/change-password` | JWT | Change password |

### WebAuthn

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/webauthn/register/options` | JWT | Registration challenge |
| POST | `/api/webauthn/register/verify` | JWT | Store credential |
| POST | `/api/webauthn/login/options` | — | Login challenge (body: `{ email }`) |
| POST | `/api/webauthn/login/verify` | — | Verify + issue JWT |
| GET | `/api/webauthn/credentials` | JWT | List passkeys |
| DELETE | `/api/webauthn/credentials/:id` | JWT | Remove passkey |

### Admin (role `ADMIN`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/stats` | User/passkey counts |

Promote a user to admin in PostgreSQL:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'you@example.com';
```

---

## Database schema (Prisma)

- **users** — email, password hash, role (`USER` | `ADMIN`)
- **webauthn_credentials** — credential ID, public key, counter, transports
- **refresh_tokens** — hashed token, expiry, revocation
- **password_reset_tokens** — hashed token, expiry, used timestamp

See `backend/prisma/schema.prisma`.

---

## Production deployment

### Checklist

1. **HTTPS everywhere** — WebAuthn requires secure context (except localhost).
2. **Align WebAuthn config** — `WEBAUTHN_RP_ID` must match your site domain; `WEBAUTHN_ORIGIN` must match the exact frontend origin.
3. **Strong secrets** — Generate with `openssl rand -base64 48` for JWT secrets.
4. **PostgreSQL** — Managed DB (RDS, Cloud SQL, Supabase).
5. **Redis** (recommended) — Replace in-memory WebAuthn challenge store in `webauthn.service.js` for multi-instance APIs.
6. **SMTP** — Production mail provider (SendGrid, SES, Resend).
7. **CORS** — Set `CLIENT_URL` to production frontend only.

### Example: Backend on Render/Railway/Fly

```bash
cd backend
npm ci
npx prisma migrate deploy
npm start
```

Env: `NODE_ENV=production`, `PORT`, `DATABASE_URL`, JWT secrets, WebAuthn vars, SMTP.

### Example: Frontend on Vercel/Netlify

```bash
cd frontend
npm ci
npm run build
```

Set `VITE_API_URL=https://your-api.com/api`.

### Nginx reverse proxy (snippet)

```nginx
server {
  listen 443 ssl http2;
  server_name api.example.com;

  location / {
    proxy_pass http://127.0.0.1:5008;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### WebAuthn production example

```env
CLIENT_URL=https://app.example.com
WEBAUTHN_RP_ID=example.com
WEBAUTHN_ORIGIN=https://app.example.com
```

---

## User flows

1. **Register** → JWT issued → Dashboard → **Register fingerprint**
2. **Login** → email/password OR **Sign in with fingerprint** (after passkey registered)
3. **Forgot password** → email link → `/reset-password?token=...`
4. **Logout** → refresh token revoked
5. **Protected routes** — React `ProtectedRoute` + API `authenticate` middleware

---

## Project scripts

| Location | Command | Purpose |
|----------|---------|---------|
| backend | `npm run dev` | API with watch |
| backend | `npm run db:migrate` | Prisma migrate |
| frontend | `npm run dev` | Vite dev server |
| frontend | `npm run build` | Production build |

---
