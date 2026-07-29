# Developer Features, APIs, & UI Integration Matrix

This document provides an exhaustive reference of individual developer contributions (Frontend, Backend APIs, Data Schemas, UI Components) across **DEV-AMRITA**, **DEV-KHUSHI**, **DEV-ARPITA**, **DEV-SHREYA**, and **QA**, followed by the unified architecture detailing how all APIs and UI features merge together post-integration.

---

## 1. Individual Developer Features & API Breakdown

### 🌿 1. DEV-AMRITA — Hyperlocal Event Portal & AI Recommendation Engine

#### 🎯 Purpose
Deliver the core event discovery experience tailored for Tier 2, 3, and 4 cities in India, including search, category filtering, quick RSVP capability, and AI-driven personalized event recommendations.

#### 🛠️ Backend APIs & Logic
- **`GET /api/events`**: Returns paginated event listings with support for `category` filtering and text-search (`search` query param).
- **`POST /api/events`**: Endpoint for event creation (used by Organizers and Admins).
- **`GET /api/events/:id`**: Detailed view for specific event instance.
- **`POST /api/events/:id/rsvp`**: Toggle/Add RSVP for authenticated user; increments attendee count.
- **`DELETE /api/events/:id/rsvp`**: Cancel RSVP for authenticated user; decrements attendee count.
- **`GET /api/recommendations`**: Returns tailored recommendations using OpenAI GPT API (or rule-based fallback based on user interests, city, and event tags), complete with match scores (e.g. `95% Match`) and personalized justification strings.

#### 🎨 Frontend UI Components
- **`EventList.jsx`**: Responsive grid rendering event cards with tier badges (`Tier 2`, `Tier 3`, `Tier 4`), seat availability indicators, search input bar, and category filter tabs.
- **`AI Recommendations Banner`**: Gradient banner at the top of the event listing showing top 3 AI-recommended events, match scores, and Quick RSVP buttons.
- **`EventRegistrationForm.jsx`**: Dual-purpose modal handling both Resident RSVP confirmations and Organizer Event publishing.

---

### 🌿 2. DEV-KHUSHI — Authentication, Security & Account Management

#### 🎯 Purpose
Provide secure user authentication, token-based session management, mandatory email verification, and profile management.

#### 🛠️ Backend APIs & Logic
- **`POST /api/auth/register`**: Public registration for Resident accounts with password hashing via `bcryptjs`. Automatically generates an email verification token. Blocks direct admin registration.
- **`GET /api/auth/verify?token=...`**: Validates email verification tokens and marks `isVerified: true` on user document.
- **`POST /api/auth/login`**: Authenticates user credentials. Returns JWT token. Enforces **Acceptance Criterion #4**: blocks login attempts with HTTP status `403` if `isVerified === false`.
- **`POST /api/auth/resend-verification`**: Generates and sends a new email verification token if expired.
- **`GET /api/users/me`**: Fetches currently logged-in user profile with populated RSVP events list.
- **`PUT /api/users/me`**: Updates user profile info (name, city, interests array).

#### 🎨 Frontend UI Components & Context
- **`RegisterForm.jsx`**: Registration UI with password confirmation, role validation, and verification link preview box.
- **`LoginForm.jsx`**: Login interface with unverified email error banner and quick resend verification trigger.
- **`AuthContext.jsx`**: Global authentication state provider. Handles JWT storage in `localStorage` (`cc_token`), sets default Axios `Authorization: Bearer <token>` header, and manages user state across reloads.

---

### 🌿 3. DEV-ARPITA — Multi-Language Localization (i18n) & WCAG Accessibility

#### 🎯 Purpose
Ensure full multi-language accessibility for users across Indian Tier 2-4 cities (English, Hindi, Kannada) and enforce WCAG 2.1 AA accessibility standards (zoom scaling, focus traps, screen readers).

#### 🛠️ Backend & System Utilities
- Locale JSON resource bundles (`en.json`, `hi.json`, `kn.json`) containing key-value translation mappings for header navigation, event cards, form labels, and alert messages.
- `dateUtils.js`: Date formatting utility adapting timestamps to localized user formats and timezones.

#### 🎨 Frontend UI Components & Utilities
- **`i18n.js` & `I18nProvider.jsx`**: Initializer for `react-i18next` with language detector and HTTP backend.
- **`LanguageSelector.jsx`**: Header control offering both a segmented button toggle (EN / HI / KN) and a dropdown selection list.
- **`useFocusTrap.js`**: Custom React hook for modal dialogs to trap keyboard focus (`Tab` / `Shift+Tab`) and handle `Escape` key close events (WCAG 2.4.3).
- **`TimezoneContext.jsx` & `TimezoneSelectorModal.jsx`**: Dynamic timezone selector enabling users to switch date/time rendering between IST, UTC, and regional formats.
- **Rem-Based Design Tokens (`index.css`)**: Scalable CSS variables using `rem` units for font sizing so text scales cleanly up to 200% under browser zoom (WCAG 1.4.4).

---

### 🌿 4. DEV-SHREYA — Role Request Workflow, Admin Dashboard & Audit Logs

#### 🎯 Purpose
Enable Resident users to request Event Organizer privileges, provide an Admin review portal to approve/reject requests, and log all administrative actions in an immutable audit trail.

#### 🛠️ Backend APIs & Logic
- **`POST /api/roles/requests`**: Endpoint allowing logged-in Residents to submit an Organizer role request with a statement of purpose.
- **`GET /api/admin/roles/requests`**: Private Admin endpoint (`auth` + `requireRole('admin')`) retrieving paginated role requests filtered by status (`pending`, `approved`, `rejected`, `all`).
- **`PATCH /api/admin/roles/requests/:id`**: Private Admin endpoint to approve or reject a role request. Upon approval, automatically updates user's `role` to `'organizer'` and generates an `AuditLog` entry.
- **`GET /api/admin/audit-logs`**: Private Admin endpoint returning administrative activity logs.
- **`models/RoleRequest.js`**: Schema storing `userId`, `message`, `status`, `reviewedBy`, `reviewedAt`, `adminNote`.
- **`models/AuditLog.js`**: Schema storing `action`, `adminId`, `targetUserId`, `details`, `timestamp`.

#### 🎨 Frontend UI Components
- **`ProfilePage.jsx`**: User profile management page with a dedicated "Request Organizer Role" form section showing request status (`pending`, `approved`, `rejected`).
- **`AdminRoleRequests.jsx`**: Admin dashboard table listing incoming role requests, applicant details, status filters, admin notes input, and one-click Approve/Reject action buttons.
- **`OrganizerCheckIn.jsx`**: Dedicated check-in desk interface for verified Organizers to view RSVPed attendee lists and manage event check-ins.

---

### 🌿 5. QA Branch — Platform Architecture, Database Resilience & Entry Point Integration

#### 🎯 Purpose
Unify all developer branches into a stable, crash-resistant production application with automated fallback mechanisms and standard server entry points.

#### 🛠️ Core Infrastructure Fixes
- **Dual Mongo URI Resolution (`config/db.js`)**: Supports both `process.env.MONGODB_URI` (QA) and `process.env.MONGO_URI` (DEV-KHUSHI) with IPv4 DNS ordering (`dns.setDefaultResultOrder('ipv4first')`) and Google DNS (`8.8.8.8`).
- **Automated `MongoMemoryServer` Fallback**: If external MongoDB Atlas connections fail or time out, `db.js` automatically boots an in-memory MongoDB instance and seeds sample data so the application never crashes in dev/demo environments.
- **Package Entry Point Fix (`package.json` & `index.js`)**: Pointed `"main": "server.js"` and added NPM scripts (`start`, `dev`, `seed`, `test`). Created `index.js` forwarder to resolve `MODULE_NOT_FOUND` under nodemon.

---

## 2. Integrated Application Architecture & Feature Flow

```mermaid
flowchart TD
    subgraph Client ["Frontend (React 18 + Vite)"]
        UI[App.jsx Router]
        HDR[Header.jsx + LanguageSelector]
        AUTH_UI[LoginForm / RegisterForm]
        EVT_UI[EventList + AI Recommendation Banner]
        PROF_UI[ProfilePage + Role Request Form]
        ADM_UI[AdminRoleRequests Dashboard]
    end

    subgraph Middleware ["Auth & Access Control"]
        JWT[AuthContext (JWT Bearer Token)]
        AUTH_MW[auth.js Middleware]
        ROLE_MW[requireRole('admin') Middleware]
    end

    subgraph Backend ["Backend API (Express 5 + Node.js)"]
        AUTH_API[routes/auth.js]
        EVT_API[routes/events.js]
        REC_API[routes/recommendations.js]
        ROLE_API[routes/roleRoutes.js]
        ADM_API[routes/adminRoutes.js]
    end

    subgraph Database ["Data Layer (Mongoose 9)"]
        DB_CFG[config/db.js]
        ATLAS[(External MongoDB Atlas)]
        MEM_DB[(MongoMemoryServer Fallback)]
    end

    UI --> HDR
    UI --> AUTH_UI
    UI --> EVT_UI
    UI --> PROF_UI
    UI --> ADM_UI

    AUTH_UI -->|POST /api/auth/register & login| AUTH_API
    EVT_UI -->|GET /api/events & /api/recommendations| REC_API
    EVT_UI -->|POST /api/events/:id/rsvp| JWT
    JWT --> AUTH_MW --> EVT_API

    PROF_UI -->|POST /api/roles/requests| JWT
    JWT --> AUTH_MW --> ROLE_API

    ADM_UI -->|GET/PATCH /api/admin/roles/requests| JWT
    JWT --> AUTH_MW --> ROLE_MW --> ADM_API

    AUTH_API --> DB_CFG
    EVT_API --> DB_CFG
    REC_API --> DB_CFG
    ROLE_API --> DB_CFG
    ADM_API --> DB_CFG

    DB_CFG -->|Primary Connection| ATLAS
    DB_CFG -.->|Fallback on Timeout| MEM_DB
```

---

## 3. End-to-End User Experience After Merge

### 👤 1. Resident User Journey
1. **Registration & Verification**: Resident registers via `RegisterForm.jsx`. Account is created as `isVerified: false`. Attempting login immediately triggers a `403` block. User verifies email via `/api/auth/verify?token=...` link and logs in successfully to receive a JWT.
2. **Hyperlocal Discovery & AI Recommendations**: User views `EventList.jsx`. `AI Recommendations Banner` displays events matched to their city and interests (e.g., `Career & Jobs` in Indore) with `95% Match` tags.
3. **One-Click RSVP**: Clicking **Register / RSVP** issues `POST /api/events/:id/rsvp`. The UI updates instantly to `✓ RSVPed (Cancel)` and updates seat counts.
4. **Organizer Role Request**: Resident opens `ProfilePage.jsx`, fills out the statement of purpose, and submits an organizer role request (`POST /api/roles/requests`). Status shows `Pending Review`.

### 👑 2. Administrator Journey
1. **Admin Authentication**: Admin logs in (`admin@indore.org`). A golden **Admin Requests** button appears in `Header.jsx`.
2. **Reviewing Role Requests**: Admin opens `AdminRoleRequests.jsx`, views pending applications, enters an admin review note, and clicks **Approve**.
3. **Role Promotion & Audit Logging**: `PATCH /api/admin/roles/requests/:id` promotes the applicant to `organizer` role and creates an entry in `AuditLog`.

### 🎪 3. Organizer Journey
1. **Promoted Access**: Upon approval, the user's role updates to `organizer`.
2. **Event Publishing**: Organizer clicks **+ Register Event** in the header. `EventRegistrationForm.jsx` opens in Event Creation mode, allowing the organizer to publish new events for Tier 2-4 cities.
3. **Attendee Check-in**: Organizer accesses `OrganizerCheckIn.jsx` to view registered residents and manage event check-ins.

---

## 4. Summary of API Endpoints Post-Merge

| Endpoint Method & Path | Access Level | Description | Developer Origin |
| :--- | :--- | :--- | :--- |
| `POST /api/auth/register` | Public | Register new resident account | DEV-KHUSHI |
| `GET /api/auth/verify` | Public | Verify email via token | DEV-KHUSHI |
| `POST /api/auth/login` | Public | Authenticate user & issue JWT | DEV-KHUSHI |
| `POST /api/auth/resend-verification` | Public | Resend email verification link | DEV-KHUSHI |
| `GET /api/users/me` | Private (Auth) | Fetch logged-in user profile & RSVPs | DEV-KHUSHI |
| `PUT /api/users/me` | Private (Auth) | Update user profile & interests | DEV-KHUSHI |
| `GET /api/events` | Public | List & search events by category/city | DEV-AMRITA |
| `POST /api/events` | Private (Organizer/Admin) | Create & publish new event | DEV-AMRITA / QA |
| `POST /api/events/:id/rsvp` | Private (Verified Resident) | Add RSVP for event | DEV-AMRITA |
| `DELETE /api/events/:id/rsvp` | Private (Verified Resident) | Cancel RSVP for event | DEV-AMRITA |
| `GET /api/recommendations` | Public / Private | AI & rule-based recommendations | DEV-AMRITA |
| `POST /api/roles/requests` | Private (Resident) | Submit organizer role request | DEV-SHREYA |
| `GET /api/admin/roles/requests` | Private (Admin) | List paginated role requests | DEV-SHREYA |
| `PATCH /api/admin/roles/requests/:id` | Private (Admin) | Approve/Reject role request | DEV-SHREYA |
| `GET /api/admin/audit-logs` | Private (Admin) | View administrative audit logs | DEV-SHREYA |
