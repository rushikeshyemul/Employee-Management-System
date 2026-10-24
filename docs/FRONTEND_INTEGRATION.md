# Workforce Hub — Frontend Developer Integration Guide

This guide provides everything a frontend developer needs to integrate and run the Next.js frontend (`frontend/`) against the Django REST Framework (DRF) backend (`backend/`), including environment setup, authentication flows, API contracts, workflow states, and test accounts.

---

## 1. Quickstart & Local Environment Setup

### Architecture Overview
- **Backend API**: Django REST Framework + PostgreSQL 18 (`http://localhost:8000`)
- **Frontend App**: Next.js 15 (App Router) + Tailwind CSS + Lucide Icons (`http://localhost:3000`)
- **API Base Path**: `http://localhost:8000/api/v1/`
- **Interactive API Docs (Swagger UI)**: `http://localhost:8000/api/docs/`
- **ReDoc Documentation**: `http://localhost:8000/api/redoc/`
- **OpenAPI 3.0 Schema**: `http://localhost:8000/api/schema/`

---

### Step 1: Starting the Backend
Make sure PostgreSQL is running locally on port `5432` with database `employee_management_system`.

```powershell
# From the repository root
# 1. Activate the Python virtual environment
backend\.venv\Scripts\Activate.ps1

# 2. Run migrations (if not already applied)
python backend/manage.py migrate

# 3. Seed demo data (creates demo accounts, departments, tasks, projects)
python backend/manage.py seed_demo_data

# 4. Start the Django development server
python backend/manage.py runserver 8000
```
> The backend server will be listening at `http://127.0.0.1:8000/`.

---

### Step 2: Configuring & Starting the Frontend
Create or verify `frontend/.env.local`:

```env
# Switch data layer from in-memory mock to live Django API
NEXT_PUBLIC_DATA_MODE=api

# Django REST Framework base URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1

# Authentication strategy ('cookie' or 'bearer')
NEXT_PUBLIC_AUTH_STRATEGY=cookie

# Fallback organisation timezone
NEXT_PUBLIC_DEFAULT_TIMEZONE=Asia/Kolkata

# Session cookie names matching backend SimpleJWT
AUTH_SESSION_COOKIE=wf_access
AUTH_REFRESH_COOKIE=wf_refresh
```

Start the frontend development server:
```powershell
# In a new terminal, navigate to the frontend folder
cd frontend

# Install dependencies
npm install

# Start Next.js in dev mode
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 2. Seeded Demo Accounts & Credentials

Every demo account is pre-seeded with the uniform password: **`WorkforceHub1!`**

| Persona / Role | Email | Name | Key Permissions & Purpose |
|---|---|---|---|
| **Super Admin** | `super.admin@helios.example` | Anika Patel | Full administrative access across all modules and settings. |
| **HR Admin** | `hr.admin@helios.example` | Priya Nair | Employee directory management, view sensitive fields (`salary_band`, `date_of_birth`), leave approvals. |
| **Manager** | `manager@helios.example` | Rohan Mehta | Team management, task assignments, attendance review, team leave approval. |
| **Project Manager** | `project.manager@helios.example` | Daniel Brooks | Project planning, task workflows, Kanban board management. |
| **Employee** | `employee@helios.example` | Kabir Sharma | Daily attendance punches, personal tasks, leave requests, profile management. |

> On the frontend login screen (`/login`), clicking any of the demo persona buttons will automatically prefill their email and password.

---

## 3. Authentication & Security Architecture

The backend supports two authentication mechanisms simultaneously:

### A. HttpOnly Cookie Mode (`NEXT_PUBLIC_AUTH_STRATEGY=cookie` - Recommended)
1. **Login Request**: `POST /api/v1/auth/login/` with `{ email, password, remember_me }`.
2. **Response**: Sets two secure cookies:
   - `wf_access`: Access token cookie (`HttpOnly`, `SameSite=Lax`, lifetime: 60 mins).
   - `wf_refresh`: Refresh token cookie (`HttpOnly`, `SameSite=Lax`, lifetime: 7 days).
3. **CORS & Credentials**:
   - The frontend's `fetch` client in `frontend/src/lib/api/client.ts` uses `credentials: "include"`.
   - The backend's `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` include `http://localhost:3000` and `http://127.0.0.1:3000`.
4. **CSRF Handling**:
   - Django issues a standard `csrftoken` cookie.
   - `client.ts` automatically extracts `csrftoken` and sets the `X-CSRFToken` header on all mutating requests (`POST`, `PATCH`, `PUT`, `DELETE`).
5. **Silent Token Refresh**:
   - When an API request returns HTTP `401 Unauthorized` (excluding `/auth/login/`, `/auth/me/`, and `/auth/token/refresh/`), `client.ts` automatically executes `POST /api/v1/auth/token/refresh/` and replays the original request.
   - If refresh fails, it redirects to `/login?session_expired=1`.

### B. Bearer Header Mode (`NEXT_PUBLIC_AUTH_STRATEGY=bearer`)
- The login and refresh responses also return `{ "access": "<token>", "refresh": "<token>" }` in the response body.
- When `NEXT_PUBLIC_AUTH_STRATEGY=bearer`, `client.ts` keeps tokens in JavaScript module memory (never in `localStorage`) and adds `Authorization: Bearer <token>` to request headers.

---

## 4. Permission & Role-Based Access Control (RBAC)

Call `GET /api/v1/auth/me/` immediately after login to fetch the user profile and permissions:

```json
{
  "id": "e4a2f2aa-d975-4b03-b56a-cb5064f4858d",
  "email": "employee@helios.example",
  "first_name": "Kabir",
  "last_name": "Sharma",
  "preferred_name": "Kabir",
  "role": "employee",
  "permissions": [
    "dashboard.view",
    "tasks.view_own",
    "attendance.clock",
    "attendance.view_own",
    "leave.view_own",
    "leave.request",
    "profile.edit_self"
  ],
  "employee_id": "emp_kabir",
  "job_title": "Software Engineer",
  "department_id": "dept_eng",
  "team_id": "team_platform",
  "manager_id": "emp_rohan",
  "timezone": "UTC",
  "avatar_url": null
}
```

### Sensitive Data Masking:
On `GET /api/v1/employees/{id}/`:
- Non-HR users receive `salary_band: null` and `date_of_birth: null`.
- Only users with role `super_admin`, `hr_admin`, or permission `employees.view_sensitive` receive real values.

---

## 5. Module-by-Module API Catalog

### 5.1 Authentication (`/api/v1/auth/`)
| Method | Endpoint | Description | Payload / Notes |
|---|---|---|---|
| `POST` | `/auth/login/` | User sign-in | `{ "email": string, "password": string, "remember_me": boolean }` |
| `POST` | `/auth/logout/` | Sign out & clear cookies | `{}` |
| `POST` | `/auth/token/refresh/` | Renew access token | `{}` (cookies) or `{ "refresh": string }` |
| `GET` | `/auth/me/` | Current user & permissions | Returns `CurrentUser` object |
| `POST` | `/auth/password-reset/` | Request password reset | `{ "email": string }` |
| `POST` | `/auth/password-reset/confirm/` | Set new password | `{ "token": string, "password": string }` |
| `POST` | `/auth/invitations/accept/` | Accept invitation | `{ "token": string, "password": string, "preferred_name"?: string }` |

---

### 5.2 Employees & Organization (`/api/v1/`)
| Method | Endpoint | Description | Filters & Query Params |
|---|---|---|---|
| `GET` | `/employees/` | Directory list | `?search=`, `?department_id=`, `?status=`, `?page=`, `?page_size=` |
| `POST` | `/employees/` | Create employee (HR only) | `EmployeeWrite` serializer payload |
| `GET` | `/employees/{id}/` | Employee profile | Masks sensitive fields for regular users |
| `PATCH` | `/employees/{id}/` | Update employee (HR) | Partial employee fields |
| `POST` | `/employees/{id}/deactivate/` | Deactivate employee | Sets status to `inactive` without deleting records |
| `GET` | `/departments/` | List departments | `?search=`, `?page=` |
| `GET` | `/teams/` | List teams | `?department_id=`, `?page=` |
| `GET` | `/projects/` | List projects | `?department_id=`, `?status=`, `?page=` |
| `GET` | `/organisation/settings/` | Company settings | Timezone, work week, shift start, breaks policy |

---

### 5.3 Tasks & State Machine Transitions (`/api/v1/tasks/`)

Tasks are managed through a strict workflow state machine.

#### Task Statuses:
`backlog` ➔ `todo` ➔ `in_progress` ➔ `in_review` ➔ `changes_requested` ➔ `done` (or `blocked`)

#### Endpoints:
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/tasks/` | List tasks / Kanban board items (`?scope=mine\|team\|all`, `?status=`, `?priority=`, `?project_id=`) |
| `POST` | `/tasks/` | Create task (`initial_status`: `backlog` or `todo`) |
| `GET` | `/tasks/{id}/` | Detail view (includes subtasks, comments, attachments, `available_actions`) |
| `POST` | `/tasks/{id}/transitions/` | Execute a workflow transition |
| `GET` | `/tasks/{id}/comments/` | List comments |
| `POST` | `/tasks/{id}/comments/` | Add comment (`{ "body": string }`) |
| `POST` | `/tasks/{id}/attachments/` | Upload file attachment (`multipart/form-data`, key: `file`) |
| `GET` | `/tasks/workflow/` | Permitted transitions definition graph |

#### Executing Transitions:
`POST /api/v1/tasks/{id}/transitions/`
```json
{
  "action": "submit_for_review",
  "comment": "Completed the API client and tests."
}
```
*Valid Actions*: `start`, `submit_for_review`, `approve`, `request_changes`, `block`, `unblock`, `move_to_backlog`, `move_to_todo`, `reopen`, `reject_assignment`.  
*Note*: Actions `block` and `request_changes` require a `comment` or `reason` with at least 3 characters.

---

### 5.4 Attendance & Punch Clock (`/api/v1/attendance/`)

The backend computes all punch timestamps authoritatively using server clock time:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/attendance/me/` | Today's punch status (`not_started`, `clocked_in`, `on_break`, `clocked_out`), worked minutes, late flag |
| `POST` | `/attendance/clock-in/` | Punch in for the day (evaluates late arrival against company schedule) |
| `POST` | `/attendance/clock-out/` | Punch out (automatically ends open break if active) |
| `POST` | `/attendance/breaks/start/` | Begin meal/rest break |
| `POST` | `/attendance/breaks/end/` | Resume from break |
| `GET` | `/attendance/records/` | Punch history (`?from=YYYY-MM-DD`, `?to=YYYY-MM-DD`, `?employee=`) |
| `POST` | `/attendance/corrections/` | Request attendance time correction (routes to Manager Approvals) |

---

### 5.5 Leave Management (`/api/v1/leave/`)

Leave balances operate on an immutable ledger model:
`available_days = allocated_days - used_days - pending_days`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/leave/balances/me/` | Current user leave entitlements (`allocated`, `used`, `pending`, `available`) |
| `GET` | `/leave/types/` | Active leave types (`annual`, `sick`, `unpaid`, `maternity`, `paternity`) |
| `GET` | `/leave/requests/` | List leave requests (`?status=`, `?leave_type_id=`) |
| `POST` | `/leave/requests/` | Submit leave request (validates overlap & sufficient balance; creates pending Approval) |
| `POST` | `/leave/requests/{id}/withdraw/` | Withdraw pending leave request (restores pending balance days) |
| `POST` | `/leave/requests/{id}/cancel/` | Cancel approved future leave request (refunds days) |

#### Leave Request Payload:
`POST /api/v1/leave/requests/`
```json
{
  "leave_type_id": "lt_annual",
  "start_date": "2026-11-10",
  "end_date": "2026-11-12",
  "partial_day": "none",
  "reason": "Family vacation"
}
```

---

### 5.6 Approvals Inbox & Concurrency (`/api/v1/approvals/`)

Managers and HR administrators review requests through a centralized inbox:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/approvals/inbox/` | Actionable approval requests (`?type=leave\|attendance_correction`, `?status=pending`) |
| `GET` | `/approvals/{id}/` | Item details with requester context and approval history |
| `POST` | `/approvals/{id}/decision/` | Approve, reject, or request changes |

#### Decision Payload:
`POST /api/v1/approvals/{id}/decision/`
```json
{
  "decision": "approve",
  "comment": "Looks good, approved."
}
```
*Decisions*: `approve`, `reject`, `request_changes`.  
*Concurrency Protection*: Attempting to decide on an approval item that is already decided returns **HTTP 409 Conflict** with `{"detail": "This approval request has already been decided."}`.

---

### 5.7 Notifications (`/api/v1/notifications/`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/notifications/` | In-app alerts (`?unread=true`, `?page=`, `?page_size=`) |
| `POST` | `/notifications/{id}/read/` | Mark individual notification as read |
| `POST` | `/notifications/read-all/` | Mark all user notifications as read |
| `GET/PATCH` | `/notifications/preferences/` | Get / update notification preferences |

---

### 5.8 Analytics, Reports & Global Search (`/api/v1/`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/reports/dashboard/` | Role-aware dashboard payload (metrics, task summary, deadlines, leave balances, attendance, headcount) |
| `GET` | `/reports/tasks/` | Detailed task velocity and status distribution (`?from=`, `?to=`, `?department_id=`) |
| `GET` | `/reports/attendance/` | Attendance summary & punctuality rates |
| `GET` | `/reports/leave/` | Leave usage breakdown by department |
| `GET` | `/reports/headcount/` | Organization headcount by department and employment type |
| `GET` | `/search/?q={query}` | Global header search across tasks, employees, and projects |

---

## 6. Error Handling & Standard Responses

The backend delivers consistent JSON error structures:

### Standard Error Shapes:
```json
// General / Auth / Permission error:
{
  "detail": "Authentication credentials were not provided."
}

// Field-level Validation Error (HTTP 400):
{
  "end_date": ["End date cannot be earlier than start date."],
  "non_field_errors": ["You already have an active leave request overlapping these dates."]
}
```

### HTTP Status Code Meanings:
- **`200 OK`**: Successful read / non-creation action.
- **`201 Created`**: Resource created successfully.
- **`204 No Content`**: Successful deletion or empty response.
- **`400 Bad Request`**: Validation error (check response field map).
- **`401 Unauthorized`**: Authentication missing or token expired.
- **`403 Forbidden`**: Insufficient permissions for this resource or action.
- **`404 Not Found`**: Resource does not exist or is out of user scope.
- **`409 Conflict`**: Stale state / duplicate approval decision.
- **`500 Internal Server Error`**: Unexpected server error.

---

## 7. Troubleshooting & FAQ

### Q: Why do I get a 403 Forbidden with "CSRF Failed: Origin checking failed"?
**A**: Ensure `NEXT_PUBLIC_API_BASE_URL` matches the backend origin and that your frontend runs on `http://localhost:3000` or `http://127.0.0.1:3000`. The backend settings include `CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS`.

### Q: Why do I see mock data instead of real database entries?
**A**: Verify that `frontend/.env.local` contains `NEXT_PUBLIC_DATA_MODE=api`. If set to `demo`, the frontend will bypass the network and serve local in-memory data. Restart the Next.js server after updating `.env.local`.

### Q: How do I test with clean data?
**A**: Re-run the demo seed command:
```powershell
python backend/manage.py seed_demo_data
```
This safely resets and synchronizes the PostgreSQL database with the complete demo organization data.
