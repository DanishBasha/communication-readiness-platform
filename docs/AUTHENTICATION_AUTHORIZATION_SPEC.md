# Authentication & Authorization Specification

> **Source of truth:** `backend/src/middleware/authenticate.ts`, `authorize.ts`, `auth.routes.ts`, `backend/src/config/env.ts`  
> **Branch:** `feature/new-ui-backend-integration`  
> **Audited:** 2026-09-28

---

## Table of Contents

1. [Roles](#1-roles)
2. [Authentication Flow](#2-authentication-flow)
3. [JWT Structure & Validation](#3-jwt-structure--validation)
4. [Token Revocation](#4-token-revocation)
5. [Authorization Middleware](#5-authorization-middleware)
6. [Role Permissions Matrix](#6-role-permissions-matrix)
7. [Password Handling](#7-password-handling)
8. [Security Mechanisms](#8-security-mechanisms)
9. [Limitations](#9-limitations)

---

## 1. Roles

Five roles defined in the `user_role` PostgreSQL enum and in `backend/src/shared/types/roles.ts`:

| Role | Description |
|------|-------------|
| `STUDENT` | Registered student; can take assessments, submit responses, manage own profile |
| `FACULTY_MENTOR` | Assigned to students; can view mentees, verify checklist items |
| `PROGRAM_ADMIN` | Full administrative access; manages users, assessments, assignments |
| `TRAINER` | Assigned to subdivisions; can view question bank |
| `PLACEMENT_COORDINATOR` | Manages credit policies, checklist items, placement eligibility |

> **Frontend-only roles** `PLATFORM_OWNER` and `SUPER_ADMIN` do NOT exist in the backend or database. These are mock roles used in the frontend demo login flow only.

---

## 2. Authentication Flow

### Registration (`POST /api/auth/register`)

```
1. Zod validate: { name, email, password (min 8), rollNumber (required), batchId (UUID), subdivisionId? }
2. Verify org.batches WHERE id = batchId (outside transaction)
3. bcrypt.hash(password, 10)
4. BEGIN transaction
5. INSERT identity.users (role='STUDENT', token_version=0, status='ACTIVE')
6. INSERT org.students (user_id, roll_number, batch_id, subdivision_id)
7. COMMIT
8. jwt.sign({ id, email, role, name, tokenVersion: 0 }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
9. eventBus.emit(USER_REGISTERED, { userId, studentId, email, name })
   → M4 handler: CreditService.createAccount(studentId) → initial balance from global policy
   → M1 handler: INSERT system.audit_logs
10. Response 201: { token, user: { id, name, email, role }, studentId }
```

**Security:** Server always sets `role = 'STUDENT'` regardless of any role field in the request body.

### Login (`POST /api/auth/login`)

```
1. Zod validate: { email (lowercased), password (min 1) }
2. SELECT identity.users WHERE LOWER(email) = $1
3. bcrypt.compare(password, hash) — runs even if email not found (DUMMY_HASH prevents timing leak)
4. If mismatch or email not found → 401 INVALID_CREDENTIALS
5. If status = 'SUSPENDED' → 403 ACCOUNT_SUSPENDED
6. If role = STUDENT: SELECT org.students WHERE user_id = $1 → get studentId
7. jwt.sign({ id, email, role, name, tokenVersion }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
8. Response 200: { token, user: { id, name, email, role }, studentId? }
```

### Logout (`POST /api/auth/logout`)

```
1. authenticate middleware validates token
2. UPDATE identity.users SET token_version = token_version + 1 WHERE id = req.user.id
3. All existing JWTs for this user now fail token_version check → effectively revoked
```

---

## 3. JWT Structure & Validation

### JWT Payload

```typescript
{
  id: string,          // identity.users.id (UUID)
  email: string,
  role: UserRole,      // one of the 5 backend roles
  name: string,
  tokenVersion: number // must match identity.users.token_version in DB
}
```

### `authenticate` Middleware (`backend/src/middleware/authenticate.ts`)

Runs on every protected route. Steps:

```
1. Extract Authorization: Bearer <token>
   → 401 TOKEN_REQUIRED if missing
2. jwt.verify(token, env.JWT_SECRET)
   → 401 TOKEN_EXPIRED if expired (distinguishes from invalid)
   → 401 TOKEN_INVALID if tampered/wrong signature
3. SELECT id, role, status, token_version, name, email FROM identity.users WHERE id = decoded.id
   → 401 TOKEN_INVALID if user not found
4. Compare decoded.tokenVersion === db.token_version
   → 401 TOKEN_REVOKED if mismatch (token was issued before last logout)
5. Check user.status !== 'SUSPENDED'
   → 403 ACCOUNT_SUSPENDED if suspended
6. Attach req.user = { id, email, role, name, tokenVersion }
```

**Note:** Every authenticated request makes one DB read to check `token_version` and status. This prevents use of tokens after password change or logout without requiring a blocklist.

### Environment Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | `dev-secret-change-in-production-min-32-chars` | Must be ≥32 chars in production |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime (used by auth routes) |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Defined in env; not yet used by routes |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Defined in env; no refresh endpoint implemented |

---

## 4. Token Revocation

Token revocation is implemented via `token_version` (integer column on `identity.users`):

- Each JWT encodes the `tokenVersion` at issuance time
- On every request, `authenticate` fetches the DB value and compares
- `POST /api/auth/logout` increments the DB value → all previously issued tokens fail
- No token blocklist or refresh token infrastructure — single long-lived token per session

**Limitation:** No refresh tokens in MVP. Users must re-login after `JWT_EXPIRES_IN` (default 7 days).

---

## 5. Authorization Middleware

### `requireRole(...roles)` (`backend/src/middleware/authorize.ts`)

Checks `req.user.role` is in the provided list. Throws `AppError(403, 'FORBIDDEN')` if not.

Applied per-route. Examples:
- `requireRole('PROGRAM_ADMIN')` on `POST /api/mentors/assign`
- `requireRole('FACULTY_MENTOR')` on `GET /api/mentors/my-students`
- `requireRole('STUDENT')` on `POST /api/attempts/start`

### `requireStudentSelfOrStaff` (`backend/src/middleware/authorize.ts`)

Applied on student profile routes. Logic:
- If `req.user.role === 'STUDENT'`: verify `org.students.user_id === req.user.id` for the `:studentId` param → 403 if mismatch
- If role is FACULTY_MENTOR, PROGRAM_ADMIN, or TRAINER: pass through unconditionally

### `requireActiveTrainerTenure` (`backend/src/middleware/trainerTenure.ts`)

**IMPLEMENTED BUT NOT MOUNTED ON ANY ROUTE.**

Logic when applied:
```
1. Check req.user.role === 'TRAINER' → 403 if not
2. Check req.params.subdivisionId present → 400 if missing
3. SELECT id FROM org.trainer_subdivision_assignments
   WHERE trainer_id = req.user.id AND subdivision_id = :subdivisionId AND end_date IS NULL
4. 403 FORBIDDEN if no active assignment row found
```

Intended for future trainer-scoped subdivision routes.

---

## 6. Role Permissions Matrix

| Endpoint Group | STUDENT | FACULTY_MENTOR | PROGRAM_ADMIN | TRAINER | PLACEMENT_COORDINATOR |
|----------------|---------|----------------|---------------|---------|----------------------|
| Auth (register/login/me/logout) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Own student profile (read/write) | ✅ own | ✅ any | ✅ any | ✅ any | — |
| Admin user list/status | — | — | ✅ | — | — |
| Admin role change | — | — | ✅ (not to PROGRAM_ADMIN) | — | — |
| CSV student import | — | — | ✅ | — | — |
| Programs (read) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Programs (write/CRUD) | — | — | ✅ | — | — |
| Mentor assign | — | — | ✅ | — | — |
| Mentor view assigned students | — | ✅ own | ✅ any | — | — |
| Trainer assign | — | — | ✅ | — | — |
| Trainer view own subdivisions | — | — | — | ✅ own | — |
| Assessments (read) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Assessments (create/edit) | — | — | ✅ | — | ✅ |
| Start attempt | ✅ | — | — | — | — |
| Submit response/audio | ✅ own | — | — | — | — |
| Session complete | ✅ own | — | — | — | — |
| View report | ✅ own | ✅ assigned mentee | ✅ any | — | — |
| Question bank (read) | — | ✅ | ✅ | ✅ | ✅ |
| Question bank (write) | — | ✅ | ✅ | ✅ | — |
| Question bank (delete) | — | — | ✅ | — | ✅ |
| Credits (view) | ✅ own | ✅ | ✅ | — | ✅ |
| Credit policies (manage) | — | — | ✅ (read) | — | ✅ (CRUD) |
| Credit adjust | — | — | — | — | ✅ |
| Checklist (read) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Checklist (create/edit) | — | — | — | — | ✅ |
| Checklist toggle (own progress) | ✅ | — | — | — | — |
| Checklist view mentee | — | ✅ assigned | — | — | — |
| Verification request | ✅ | — | — | — | — |
| Verification approve | — | ✅ assigned only | — | — | — |
| Placement eligibility | ✅ own | ✅ mentee | ✅ | — | ✅ |
| Placement report | — | — | ✅ | — | ✅ |

---

## 7. Password Handling

- **Hashing:** `bcrypt.hash(password, 10)` — cost factor 10 (applies at registration and CSV import)
- **Verification:** `bcrypt.compare(input, hash)` — constant-time comparison
- **Timing attack prevention:** If email not found, backend still calls `bcrypt.compare` against a static `DUMMY_HASH` — prevents timing-based user enumeration
- **Never stored in plaintext** — only `password_hash` column in `identity.users`
- **Never returned** — `password_hash` is never included in any API response
- **Never logged** — no logging of passwords in any handler (audit confirms raw password is never referenced after hashing)
- **CSV import:** `passwordRaw` is extracted from the CSV row and immediately passed to `bcrypt.hash()`; never stored in an intermediate variable, never logged
- **Role escalation guard:** `PATCH /admin/users/:id/role` cannot grant `PROGRAM_ADMIN` — server blocks it

---

## 8. Security Mechanisms

| Mechanism | Implementation |
|-----------|---------------|
| JWT signing | HS256, `JWT_SECRET` (min 32 chars) |
| Token revocation | `token_version` DB column checked on every request |
| Password hashing | bcrypt cost 10 |
| Timing attack prevention | DUMMY_HASH for missing users |
| HTTP security headers | `helmet` middleware |
| CORS | `env.CORS_ORIGIN` (default `http://localhost:5173`) |
| Role escalation prevention | `PATCH /role` cannot grant PROGRAM_ADMIN |
| Scope guards | Student can only access own records; mentor can only verify assigned students |
| Proctoring | Tab switch count tracked in session state_data; session TERMINATED after `MAX_TAB_SWITCH_LIMIT + 2` switches |
| Audit logging | `USER_REGISTERED` events → `system.audit_logs` |

---

## 9. Limitations

| Gap | Details |
|----|---------|
| No refresh tokens | Single JWT; user must re-login after expiry (default 7 days) |
| No rate limiting | `POST /api/auth/register` and `POST /api/auth/login` have no rate limiting |
| `trainerTenure` middleware not applied | `requireActiveTrainerTenure` exists but is not mounted on any route |
| `SUPER_ADMIN` / `PLATFORM_OWNER` not supported | These frontend roles cannot be stored in the DB; mock login only |
| No email verification | Registration does not verify email addresses |
| No MFA | No multi-factor authentication mechanism |
| Dev default JWT secret | Default `JWT_SECRET` in env is a known value — must be overridden in production |
