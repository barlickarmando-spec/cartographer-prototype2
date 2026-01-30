# Auth + Account Setup

Run these commands in order from the project root.

## 1. Install dependencies

```bash
npm install
```

This installs Next.js, React, Prisma, bcryptjs, iron-session, and types.

## 2. Environment variables

Copy the example env and set your values:

```bash
cp .env.example .env
```

Edit `.env`:

- **DATABASE_URL** – Leave as `file:./dev.db` for SQLite (Prisma will put `dev.db` inside the `prisma` folder).
- **SESSION_SECRET** – Must be at least 32 characters. Generate one with:
  ```bash
  openssl rand -base64 32
  ```
  Paste the result into `.env` as `SESSION_SECRET="..."`.

## 3. Prisma: init and migrate

Create the SQLite database and run the first migration:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

This creates `prisma/dev.db` and the `User` table.

## 4. Run the app

```bash
npm run dev
```

Then:

- **Sign up:** http://localhost:3000/signup  
- **Log in:** http://localhost:3000/login  
- **Account (protected):** http://localhost:3000/account (redirects to login if not logged in)

## Summary of what was added

- **Prisma:** `prisma/schema.prisma` – User model (id, username, email, passwordHash, createdAt, updatedAt).
- **DB client:** `lib/db.ts` – Singleton Prisma client.
- **Session:** `lib/session.ts` – iron-session config, `getSession()`, `getCurrentUserId()`; cookie is HttpOnly, Secure in prod, SameSite=lax.
- **API routes:**  
  - `POST /api/auth/signup` – Validate, hash password, create user, start session.  
  - `POST /api/auth/login` – Find by username or email, verify password, start session.  
  - `POST /api/auth/logout` – Destroy session.
- **Middleware:** `middleware.ts` – Protects `/account`; redirects to `/login` if no session cookie.
- **Pages:**  
  - `/signup` – Username, email, password, confirm password.  
  - `/login` – Username or email + password.  
  - `/account` – “Logged in as {username}”, email, createdAt, Log out button (server-rendered; protected by middleware + server check).

No questionnaire or other app logic was changed; only auth and account are implemented.
