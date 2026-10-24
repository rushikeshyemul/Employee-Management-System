# API Contract — Workforce Hub Backend

## 1. Overview
- **Base URL**: `http://localhost:8000/api/v1/`
- **Schema & Docs**:
  - Swagger UI: `http://localhost:8000/api/docs/`
  - ReDoc: `http://localhost:8000/api/redoc/`
  - OpenAPI 3.0 Schema: `http://localhost:8000/api/schema/`
- **Authentication**: JWT via HttpOnly cookies (`wf_access`, `wf_refresh`) or `Authorization: Bearer <token>`.
- **Response Format**: JSON with `application/json` Content-Type. All timestamps in ISO 8601 UTC format.

## 2. Authentication Strategy
1. **Cookie Mode (`credentials: "include"`)**:
   - `wf_access`: Access token cookie (default lifetime 30 minutes).
   - `wf_refresh`: Refresh token cookie (default lifetime 7 days).
   - `csrftoken`: Standard Django CSRF token; clients must send header `X-CSRFToken` on mutating requests (POST, PATCH, DELETE).
2. **Bearer Mode**:
   - Client sends header: `Authorization: Bearer <access_token>`.

## 3. Implemented Endpoints Catalog

### Authentication (`/api/v1/auth/`)
| Method | Path | Request Body | Response (200/201) | Description |
|---|---|---|---|---|
| POST | `/api/v1/auth/login/` | `{ email, password, remember_me? }` | `{ user: CurrentUser, access, refresh }` | Authenticates user and sets session cookies |
| POST | `/api/v1/auth/logout/` | `{ refresh? }` | `{ detail: "Successfully logged out." }` | Clears cookies and blacklists refresh token |
| POST | `/api/v1/auth/token/refresh/` | `{ refresh? }` (or cookie) | `{ access, refresh }` | Rotates access and refresh tokens |
| GET | `/api/v1/auth/me/` | None | `CurrentUser` | Returns current user profile, role, and permissions |
| POST | `/api/v1/auth/password-reset/` | `{ email }` | `{ detail: "..." }` | Initiates password reset flow |
| POST | `/api/v1/auth/password-reset/confirm/` | `{ token, password }` | `{ detail: "..." }` | Confirms password reset |
| POST | `/api/v1/auth/invitations/accept/` | `{ token, password, preferred_name? }` | `{ detail: "..." }` | Accepts invitation and activates account |

### Organisation Structure (`/api/v1/`)
| Method | Path | Permissions | Description |
|---|---|---|---|
| GET | `/api/v1/organisation/settings/` | Authenticated | Retrieve organisation configuration |
| PATCH | `/api/v1/organisation/settings/` | `super_admin`, `hr_admin` | Update organisation settings |
| GET | `/api/v1/departments/` | Authenticated | List all departments (paginated) |
| POST | `/api/v1/departments/` | `hr_admin` | Create department |
| GET | `/api/v1/departments/{id}/` | Authenticated | Retrieve department details |
| GET | `/api/v1/teams/` | Authenticated | List all teams (paginated) |
| POST | `/api/v1/teams/` | `hr_admin` | Create team |
| GET | `/api/v1/teams/{id}/` | Authenticated | Retrieve team details |
| GET | `/api/v1/projects/` | Authenticated | List all corporate projects |
| POST | `/api/v1/projects/` | `projects.manage` / HR | Create project |
| GET | `/api/v1/projects/{id}/` | Authenticated | Retrieve project details |

### Employees (`/api/v1/employees/`)
| Method | Path | Permissions | Description |
|---|---|---|---|
| GET | `/api/v1/employees/` | `employees.view` | List employees (filters: `department_id`, `manager_id`, `location`, `employment_type`, `status`) |
| POST | `/api/v1/employees/` | `employees.manage` / HR | Create employee record and linked user account |
| GET | `/api/v1/employees/{id}/` | Authenticated | Retrieve employee details (sensitive fields gated) |
| PATCH | `/api/v1/employees/{id}/` | `employees.manage` / HR | Update employee HR details |
| POST | `/api/v1/employees/{id}/deactivate/` | `employees.deactivate` / HR | Deactivates employee and linked login account |
| GET | `/api/v1/employees/me/` | Authenticated | Retrieve current user's employee record |
| PATCH | `/api/v1/employees/me/` | Authenticated (Self) | Edit personal profile (bio, phone, emergency contact) |

### Tasks & Workflows (`/api/v1/tasks/`)
| Method | Path | Permissions | Description |
|---|---|---|---|
| GET | `/api/v1/tasks/` | Authenticated | List tasks (filters: `scope=mine/assigned/created`, `project_id`, `department_id`, `status`, `priority`) |
| POST | `/api/v1/tasks/` | `tasks.create` | Create task with auto-generated project key (`WF-101`) |
| GET | `/api/v1/tasks/{id}/` | Authenticated | Retrieve task detail with comments, events, subtasks, and `available_actions` |
| PATCH | `/api/v1/tasks/{id}/` | Authenticated | Update task fields (reporter/assignee/lead) |
| POST | `/api/v1/tasks/{id}/transition/` | State-dependent | Execute state transition (`action`: start, submit_for_review, approve, request_changes, block, unblock, cancel, reopen) |
| GET | `/api/v1/tasks/{id}/comments/` | Authenticated | List task discussion comments |
| POST | `/api/v1/tasks/{id}/comments/` | Authenticated | Post new comment on task |
| GET | `/api/v1/tasks/workflow-definition/` | Authenticated | Retrieve workflow states, transitions, and column configurations |

### Attendance (`/api/v1/attendance/`)
| Method | Path | Permissions | Description |
|---|---|---|---|
| GET | `/api/v1/attendance/me/` | Authenticated | Retrieve today's punch state (`status`, `clock_in_at`, `worked_minutes`, `breaks_enabled`) |
| POST | `/api/v1/attendance/clock-in/` | Authenticated | Authoritative server clock-in (evaluates standard shift for late arrival) |
| POST | `/api/v1/attendance/clock-out/` | Authenticated | Authoritative clock-out, calculates worked minutes excluding breaks |
| POST | `/api/v1/attendance/breaks/start/` | Authenticated | Start break timer |
| POST | `/api/v1/attendance/breaks/end/` | Authenticated | End break timer and accumulate break minutes |
| GET | `/api/v1/attendance/records/` | Authenticated | View attendance history (filters: `date_from`, `date_to`, `status`, `department_id`) |
| GET | `/api/v1/attendance/corrections/` | Authenticated | List submitted correction requests |
| POST | `/api/v1/attendance/corrections/` | Authenticated | Request attendance correction; automatically opens approval item |

### Leave Management (`/api/v1/leave/`)
| Method | Path | Permissions | Description |
|---|---|---|---|
| GET | `/api/v1/leave/types/` | Authenticated | List company leave types (annual, sick, bereavement, etc.) |
| GET | `/api/v1/leave/balances/me/` | Authenticated | Retrieve requesting user's leave balances and pending/available days |
| GET | `/api/v1/leave/balances/` | `hr_admin`, `manager` | List team or organisation leave balances |
| GET | `/api/v1/leave/requests/` | Authenticated | List leave requests (user's own or team based on permissions) |
| POST | `/api/v1/leave/requests/` | Authenticated | Submit leave request with ledger balance validation; generates manager approval |
| POST | `/api/v1/leave/requests/{id}/withdraw/` | Request Owner | Withdraw pending leave request and restore reserved days |
| POST | `/api/v1/leave/requests/{id}/cancel/` | Request Owner / HR | Cancel approved future leave request |

### Approvals Engine (`/api/v1/approvals/`)
| Method | Path | Permissions | Description |
|---|---|---|---|
| GET | `/api/v1/approvals/inbox/` | `approvals.review` / Manager | List pending actionable approval items for the current user |
| GET | `/api/v1/approvals/{id}/` | Approver / Owner / HR | Retrieve approval details and audit context |
| POST | `/api/v1/approvals/{id}/decision/` | Assigned Approver / HR | Submit decision (`approve`, `reject`, `request_changes`) with transactional ledger sync |

### Notifications (`/api/v1/notifications/`)
| Method | Path | Permissions | Description |
|---|---|---|---|
| GET | `/api/v1/notifications/` | Authenticated | List user notifications (filters: `category`, `unread=true`) |
| POST | `/api/v1/notifications/{id}/read/` | Recipient | Mark single notification as read |
| POST | `/api/v1/notifications/read-all/` | Recipient | Bulk mark all notifications as read |
| GET | `/api/v1/notifications/preferences/` | Authenticated | Retrieve delivery preferences (in-app, email, categories) |
| PATCH | `/api/v1/notifications/preferences/` | Authenticated | Update notification delivery preferences |

### Reports & Global Search (`/api/v1/reports/`, `/api/v1/search/`)
| Method | Path | Permissions | Description |
|---|---|---|---|
| GET | `/api/v1/reports/dashboard/` | Authenticated | Complete role-aware dashboard payload matching frontend `DashboardResponse` |
| GET | `/api/v1/reports/tasks/` | Authenticated | Aggregated task distribution by status and priority |
| GET | `/api/v1/reports/attendance/` | Authenticated | Attendance summary metrics (present, late, absent) |
| GET | `/api/v1/reports/leave/` | Authenticated | Leave utilization and pending requests summary |
| GET | `/api/v1/reports/headcount/` | `hr_admin` / Auditor | Workforce headcount breakdown by department and employment type |
| GET | `/api/v1/search/?q={query}` | Authenticated | Global search across tasks, employees, and projects |

## 4. Error Shapes
All error responses adhere to standard DRF conventions:
```json
{
  "detail": "Error description message."
}
```
Validation errors return field maps:
```json
{
  "email": ["Enter a valid email address."],
  "non_field_errors": ["Invalid credentials."]
}
```
Conflict errors (e.g. duplicate approval decision) return HTTP 409:
```json
{
  "detail": "This approval has already been decided."
}
```
