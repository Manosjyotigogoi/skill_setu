# Skill-Setu Backend

A real Node.js/Express + MongoDB backend for the **Skill-Setu** frontend
(`Frontend/` in your uploaded project) — a mock national skilling &
placement portal. The frontend currently runs entirely on local React
state (see `src/context/AppContext.jsx`); this backend gives it a real
API to talk to.

Stack: **Node.js, Express, MongoDB/Mongoose, JWT (httpOnly cookie)** —
same pattern as your Quad / Airbnb-clone / school-management-app projects.

---

## 1. What's real vs. stubbed

Being upfront about this so nothing surprises you later:

| Feature | Status |
|---|---|
| Auth (password login/register), profile, settings | **Fully real** |
| Skills, exams (grading server-side), credentials | **Fully real** |
| Courses + enrollment, campus drives + applications | **Fully real**, seeded catalog data |
| Role/drive skill matching (% match, gaps) | **Fully real**, rule-based substring matcher (`src/utils/matching.js`) — not an ML matcher |
| Document upload + skill extraction | **Real for PDFs** (actual text extraction via `pdf-parse` + keyword matching, see `src/utils/skillExtractor.js`). Word docs/images are accepted and stored but not OCR'd — no OCR pipeline is wired up, so they're marked `PARSED` with zero extracted skills rather than faked |
| Admin roster + telemetry | **Fully real**, computed live from the DB (no hardcoded numbers) |
| Digital dossier + public verification link | **Real**, but the "cryptographic signature" is an HMAC-SHA256 over key fields — a lightweight tamper-check, **not** a legal e-signature/PKI certificate |
| OTP-based passwordless login | **Stubbed delivery** — OTPs are generated, hashed, and expiry-checked for real, but there's no SMS/email gateway wired up (see `src/utils/otpGateway.js`). It logs the OTP server-side and (in dev only) echoes it in the API response |
| Google SSO | **Not implemented.** The frontend's "Google SSO" button has nothing to call yet — wire up `passport-google-oauth20` when you have OAuth client credentials |

---

## 2. Setup

```bash
cd skill-setu-backend
npm install
cp .env.example .env
# edit .env — at minimum set MONGO_URI and JWT_SECRET
```

Point `MONGO_URI` at a local MongoDB or an Atlas cluster (same as your
other projects). Then seed the catalog data (target roles, courses,
campus drives, one sample exam):

```bash
npm run seed
```

Create your first admin account (admins are never created through the
public API — same convention as Quad):

```bash
npm run create-admin -- --name "Placement Officer" --email admin@nit.edu.in --password "SomeStrongPassword123"
```

Run it:

```bash
npm run dev     # nodemon, auto-restart
npm start       # plain node
```

The API listens on `http://localhost:5000` by default. `FRONTEND_URL` in
`.env` controls CORS — set it to wherever `npm run dev` serves the Vite
frontend (default `http://localhost:5173`).

### Live job discovery

`POST /api/ai/discover-jobs` uses the candidate's verified and self-reported
skills plus the requested location. To enable live results, create an Adzuna
developer account and set these backend-only variables in `.env`:

```dotenv
JOB_SEARCH_PROVIDER=adzuna
JOB_SEARCH_API_KEY=APP_ID:APP_KEY
JOB_SEARCH_API_URL=https://api.adzuna.com/v1/api/jobs/in/search/1
```

Alternatively, `JOB_SEARCH_API_URL` can point to a compatible JSON provider that
accepts `q` and `location` query parameters and bearer authentication. The API
key is never sent to the frontend. Results are normalized, deduplicated, capped
at 20, matched against the candidate skills, and cached for five minutes.

If the provider variables are missing or the provider is unavailable, the
endpoint returns clearly marked fallback search links for LinkedIn, Naukri,
Indeed, and Foundit. Gemini market insight is optional and does not prevent job
results from being returned when it is unavailable.

Run the backend checks with `npm test`.

---

## 3. Auth model

- **Students/trainees**: register with `name` + (`email` and/or `phone`)
  + optional `password`. Password login and OTP-based passwordless login
  both work.
- **Admins**: provisioned only via `scripts/createAdmin.js`, log in with
  `email` + `password`. Admins cannot use the OTP path (enforced
  server-side).
- Sessions are a JWT in an **httpOnly cookie** (`COOKIE_NAME` in `.env`),
  30-day expiry. `credentials: 'include'` must be set on frontend fetch
  calls for the cookie to be sent.

---

## 4. API reference

All routes are prefixed with `/api`. Routes marked 🔒 require a valid
session cookie; 🔒🔒 also require `role: admin`.

### Auth — `/api/auth`
| Method & path | Body | Notes |
|---|---|---|
| `POST /register` | `{ name, email?, phone?, password?, accountType? }` | `accountType`: `student` \| `trainee` (default `student`). Logs you in immediately. |
| `POST /login` | `{ identifier, password }` | `identifier` = email or phone |
| `POST /otp/request` | `{ identifier }` | Student/trainee only. Returns `devOtp` in the response when `NODE_ENV != production` |
| `POST /otp/verify` | `{ identifier, otp }` | Logs you in on success |
| `POST /logout` | — | Clears the session cookie |
| `GET /me` 🔒 | — | Current user's profile |

### Profile — `/api/profile` 🔒
| Method & path | Body |
|---|---|
| `GET /me` | — |
| `PATCH /me` | Any of: name, hindiName, email, phone, branch, degree, academicYear, institution, cgpa, employmentStatus, employmentSummary, currentCompany, currentRole, currentPackage, experienceYears, avatarUrl |
| `PATCH /settings` | Any of: autoSyncDigilocker, recruiterVisibility, emailAlerts, smsAlerts (booleans) |

### Skills — `/api/skills` 🔒
`GET /`, `GET /:id`, `DELETE /:id`

Skills are created indirectly — by passing an exam, uploading a document
that yields matches, or being seeded — not created directly by the
student (mirrors how the frontend presents them as verified/institutional).

### Target roles (career-role matching) — `/api/roles` 🔒
`GET /`, `GET /:id` — returns each role's required skills annotated
`VERIFIED`/`GAP` against your live verified skills, plus a computed
`currentMatch` percentage.

### Courses — `/api/courses` 🔒
- `GET /` — catalog + your enrollment/progress
- `POST /:id/enroll` — toggles enrollment (mirrors `toggleCourseEnrollment` in the frontend)
- `PATCH /:id/progress` `{ progress: 0-100 }`

### Campus drives — `/api/drives` 🔒
- `GET /` — open drives with live `matchPercentage`, `matchedSkills`, `missingSkills`, and your application status
- `GET /:id`
- `POST /:id/apply` — rejects if your CGPA is below `eligibilityCgpa` or you've already applied

### Skill exams — `/api/exams` 🔒
- `GET /` — list, with `alreadyPassed` per exam
- `GET /:id` — questions only, **no correct answers sent to the client**
- `POST /:id/submit` `{ answers: [optionIndex, ...] }` — graded server-side; a pass creates/updates the matching `Skill` record and recomputes your readiness score

### Documents — `/api/documents` 🔒
- `GET /` — your uploads + status
- `POST /upload` — `multipart/form-data`, field name `file` (PDF/DOC/DOCX/PNG/JPEG, ≤10MB by default). PDFs get real text extraction + skill matching; other types are stored but not parsed.
- `GET /:id/file` — download your own original upload

### Digital dossier — `/api/dossier`
- `GET /me` 🔒 — your profile + verified skills + enrolled courses + an HMAC signature
- `GET /verify/:skillSetuId` — **public**, no auth (what a recruiter would hit)

### Admin — `/api/admin` 🔒🔒
- `GET /roster` — every student/trainee with live skill counts, readiness, placement status
- `POST /roster/:id/approve` — marks sovereign credential verification (mirrors `approveStudentCredentials`)
- `GET /telemetry` — dashboard numbers, computed live (no hardcoded stats)
- `GET /dossier-lookup/:skillSetuId` — same as the public verify endpoint, for the admin's in-portal lookup box

### Health check
`GET /api/health` — no auth, useful for uptime checks / confirming the server is up.

---

## 5. Data model notes

- **Career-role and drive matching** is intentionally simple: a
  normalized substring match between a skill's name and what's required
  (`src/utils/matching.js`). It's transparent and easy to reason about,
  but it isn't a real taxonomy or embedding-based matcher — good enough
  for a working demo, worth revisiting if this goes further.
- **Readiness score** is recomputed from actual verified skills
  (breadth + average strength) every time skills change — see
  `src/utils/recomputeProfile.js` — rather than being an arbitrary
  number you set by hand.
- **CTC values** on drives are stored as `ctcMinLpa`/`ctcMaxLpa` numbers
  (so telemetry can compute real averages) alongside a display string.

---

## 6. Project layout

```
skill-setu-backend/
├─ server.js               # connects to Mongo, then starts listening
├─ src/
│  ├─ app.js                # Express app assembly (no DB/listen — easy to test)
│  ├─ config/db.js
│  ├─ models/                # 10 Mongoose schemas
│  ├─ controllers/           # business logic per resource
│  ├─ routes/                # thin route -> controller wiring
│  ├─ middleware/             # auth guard, multer upload, error handler
│  ├─ utils/                  # tokens, IDs, matching, skill extraction, OTP stub
│  └─ seed/seed.js            # target roles, courses, drives, sample exam
├─ scripts/createAdmin.js
└─ uploads/                    # local disk storage for uploaded documents (dev)
```

For production file storage, swap `src/middleware/upload.js`'s disk
storage for Cloudinary (same pattern you used in Quad/Airbnb-clone) —
the rest of the document pipeline doesn't need to change.

---

## 7. Wiring up the existing frontend

`AppContext.jsx` currently holds everything in `useState`. To connect it:

1. Add `credentials: 'include'` to every `fetch` call so the auth cookie is sent.
2. Replace the seeded `useState(INITIAL_...)` calls with data fetched from
   the corresponding endpoint above on mount.
3. Replace the local mutator functions (`toggleCourseEnrollment`,
   `applyForDrive`, `simulateDocumentIntake`, `approveStudentCredentials`)
   with calls to the matching API endpoint, then update state from the
   response.

Happy to wire this up for you if you want the frontend actually talking
to this backend end-to-end — just ask.
