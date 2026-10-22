# Workforce Hub API contract

Status: **proposed**. Nothing in this file is confirmed by the Django project. Paths, field names, pagination, and error shapes are what the frontend currently sends and expects. Change `src/lib/api/endpoints.ts` and `src/types/index.ts` together when the backend contract differs.

Base URL: `NEXT_PUBLIC_API_BASE_URL`, default `http://localhost:8000/api/v1`. All paths below are relative to that base and use a trailing slash.

## Authentication

Two strategies, selected with `NEXT_PUBLIC_AUTH_STRATEGY`:

| Strategy | Frontend behaviour |
| --- | --- |
| `cookie` (default) | `credentials: "include"` on every request. If a non-HttpOnly cookie named `csrftoken` is present, the client sends `X-CSRFToken`. The client never reads `wf_access` or `wf_refresh`. |
| `bearer` | `Authorization: Bearer <access>` using a token kept in module memory. Refresh sends `{ "refresh": "<refresh>" }`. Tokens are cleared on logout and on refresh failure. They are not stored in `localStorage`. |

`src/proxy.ts` (API cookie mode only) redirects to `/login` when `AUTH_SESSION_COOKIE` (default `wf_access`) is missing. Confirm that cookie name.

A `401` on any request except `POST /auth/login/`, `GET /auth/me/`, and `POST /auth/token/refresh/` triggers one refresh. If refresh fails, the UI goes to `/session-expired`. `GET /auth/me/` returning `401` means anonymous and does not refresh, so the login page does not bounce.

## Permissions

`GET /auth/me/` should return `permissions: string[]`. If the array is empty, the UI uses the role defaults in `src/lib/permissions.ts` for navigation only and shows a banner. The API remains the source of truth: hidden buttons are not security.

Roles: `super_admin`, `hr_admin`, `manager`, `project_manager`, `employee`.

Sensitive employee fields `salary_band` and `date_of_birth` should be omitted unless the caller has `employees.view_sensitive`. Personal email and emergency contact should be limited to the person and HR.

## Errors

Assumed Django REST Framework shape, not confirmed:

```json
{ "detail": "Human readable message." }
```

or

```json
{ "email": ["Enter a valid email."], "non_field_errors": ["Invalid."] }
```

The first field message or `non_field_errors[0]` is shown in a toast. Status codes used by the UI:

| Code | Meaning |
| --- | --- |
| 400 | Validation. Field map is shown when present. |
| 401 | Session missing or refresh failed. |
| 403 | Authenticated but not allowed. |
| 404 | Record missing or outside the caller's scope. |
| 409 | Stale decision, such as approving a request that is already final. |
| 5xx | Generic server failure with retry. |

## Pagination and filters

List endpoints are parsed as:

```json
{ "count": 0, "next": null, "previous": null, "results": [] }
```

A bare JSON array is treated as one page. Query parameters used by the UI:

| Param | Meaning |
| --- | --- |
| `page` | 1-based page |
| `page_size` | Page size. Boards ask for `100`. |
| `search` | Free text |
| `ordering` | Field name, prefix `-` for descending |
| `status`, `priority`, `assignee`, `project`, `department`, `employee`, `type`, `category`, `from`, `to` | Filters. Dates are `YYYY-MM-DD`. |

Reports also send `department_id`. The demo service accepts either `department` or `department_id`. Pick one.

## Task workflow

`POST /tasks/{id}/transitions/` body:

```json
{ "action": "submit_for_review", "comment": "optional" }
```

Actions: `accept`, `request_clarification`, `reject_assignment`, `start`, `submit_for_review`, `approve`, `request_changes`, `resume`, `block`, `unblock`, `move_to_backlog`, `move_to_todo`, `reopen`.

`reject_assignment` must not delete the task. It stores `rejection_reason` and sets `assignment_state` to `rejected`. `request_changes` and `block` require a comment of at least 3 characters. Illegal transitions return `400`. The response should be the task detail, including `available_actions` when the detail endpoint provides them. The client also computes actions locally from `src/lib/tasks/transitions.ts` until `GET /tasks/workflow/` is confirmed.

Columns: `backlog`, `todo`, `in_progress`, `in_review`, `changes_requested`, `done`, `blocked`.

## Endpoints

Authentication on every route below except login, password reset, reset confirm, and invitation accept.

### Auth

| Method | Path | Body | Success |
| --- | --- | --- | --- |
| POST | `/auth/login/` | `{ email, password, remember_me? }` | `{ user, access?, refresh? }` |
| POST | `/auth/logout/` | `{}` | `{ detail }` |
| POST | `/auth/token/refresh/` | `{}` or `{ refresh }` | `{ access?, refresh? }` or `{ detail }` |
| POST | `/auth/password-reset/` | `{ email }` | `{ detail }` Same message whether or not the email exists. |
| POST | `/auth/password-reset/confirm/` | `{ token, password }` | `{ detail }` |
| POST | `/auth/invitations/accept/` | `{ token, password, preferred_name? }` | `{ detail }` |
| GET | `/auth/me/` | | `CurrentUser` including `role` and `permissions` |

### Employees, departments, teams, projects

| Method | Path | Permission intent | Notes |
| --- | --- | --- | --- |
| GET | `/employees/` | `employees.view` or team/self scope | Filters: `search`, `department`, `manager`, `location`, `employment_type`, `status`, `team` |
| POST | `/employees/` | `employees.manage` | `EmployeeWrite`. `invite: true` creates an invited account. |
| GET | `/employees/{id}/` | scope | Omit sensitive fields by permission. |
| PATCH | `/employees/{id}/` | `employees.manage` | HR fields. |
| PATCH | `/employees/me/` | `profile.edit_self` | `ProfileWrite` only. |
| POST | `/employees/{id}/deactivate/` | `employees.deactivate` | Sets `inactive`. Does not delete history. |
| GET/POST | `/departments/` | `departments.view` / `departments.manage` | |
| GET | `/teams/` | `departments.view` or `employees.view_team` | |
| GET/POST | `/projects/` | `projects.view` / `projects.manage` | |
| GET/PATCH | `/projects/{id}/` | same | |

`GET /employees/?page_size=200` is also used as the assignee picker for people who can assign tasks but cannot open the HR directory.

### Tasks

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/tasks/` | `scope=mine`, `review=1`, plus filters above |
| POST | `/tasks/` | `TaskWrite`. Initial status only `backlog` or `todo`. |
| GET | `/tasks/{id}/` | Detail with comments, events, attachments, available actions |
| PATCH | `/tasks/{id}/` | `TaskUpdate`. Status changes go through transitions. |
| POST | `/tasks/{id}/transitions/` | See workflow |
| GET/POST | `/tasks/{id}/comments/` | POST `{ body }` |
| POST | `/tasks/{id}/attachments/` | `multipart/form-data` field `file` |
| GET | `/tasks/workflow/` | Optional. Documented transitions if the server restricts them further. |

### Attendance

Official times come from the server. The client does not invent a punch from the device clock.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/attendance/me/` | Today's state: `status` is `not_started`, `clocked_in`, `on_break`, or `clocked_out`. Includes server timestamps, `worked_minutes`, `timezone`, `is_late`, `missing_clock_out`, `breaks_enabled`. |
| POST | `/attendance/clock-in/` | `{}` |
| POST | `/attendance/clock-out/` | `{}`. Ends an open break first. |
| POST | `/attendance/breaks/start/` | `{}` |
| POST | `/attendance/breaks/end/` | `{}` |
| GET | `/attendance/records/` | Filters: `employee`, `department`, `from`, `to`, `exception=1` |
| GET/POST | `/attendance/corrections/` | POST `{ date, requested_clock_in_at, requested_clock_out_at, reason }`. Timestamps are ISO instants. |

A second clock-in after clock-out on the same day is rejected. Corrections keep the original punch and become an approval item.

### Leave

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/leave/types/` | |
| GET | `/leave/balances/me/` | Allocated, used, pending, available. Do not hardcode entitlements in the client. |
| GET | `/leave/balances/?employee=` | Manager or HR scope. |
| GET/POST | `/leave/requests/` | POST `{ leave_type_id, start_date, end_date, partial_day, reason }`. `partial_day` is `none`, `am`, or `pm`. |
| GET | `/leave/requests/{id}/` | Include `warnings` and `reviewer_comment`. |
| POST | `/leave/requests/{id}/withdraw/` | Pending only. |
| POST | `/leave/requests/{id}/cancel/` | Approved, and the start date is not in the past. |

Overlap and insufficient balance return `400` with a field or detail message. Approval does not happen on create.

### Approvals

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/approvals/inbox/` | Open items unless `include_closed=1` or `status` is set. Filters: `type`, `employee`, `from`, `to`. |
| GET | `/approvals/{id}/` | Context rows and decision history. |
| POST | `/approvals/{id}/decision/` | `{ decision, comment }`. `decision` is `approve`, `reject`, or `request_changes`. Reject and request-changes require a comment. A second final decision returns `409`. |

Types the UI understands: `leave`, `attendance_correction`, `hr_request`, `profile_change`.

### Notifications

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/notifications/` | `category`, `unread=1`. Unread count uses `page_size=1` and reads `count`. |
| POST | `/notifications/{id}/read/` | |
| POST | `/notifications/read-all/` | |
| GET/PATCH | `/notifications/preferences/` | Proposed. The screen does not edit preferences until this is confirmed. |

No WebSocket or Server-Sent Events client is implemented.

### Reports

All accept `from`, `to`, and `department_id`. Responses must not be presented as a productivity score. The UI labels the range it requested.

| Method | Path | Permission intent |
| --- | --- | --- |
| GET | `/reports/dashboard/` | Any signed-in role. Scope the payload to self, team, or organisation. |
| GET | `/reports/tasks/` | `reports.view_team` or `reports.view_org` |
| GET | `/reports/attendance/` | `reports.view_org` in the demo rules |
| GET | `/reports/leave/` | team or organisation |
| GET | `/reports/headcount/` | `reports.view_org` |

`GET /reports/dashboard/` is the source for dashboard cards. Expected sections are in `DashboardResponse` in `src/types/index.ts`: metrics, task summary, deadlines, overdue tasks, leave balances, attendance today, team workload, organisation headcount, and recent audit when permitted. Omit sections the caller cannot see.

### Proposed modules

These screens are labelled **Proposed** in the UI. Demo mode serves local data. API mode calls the path and shows the error if it is not implemented. Do not treat them as a committed first release.

| Method | Path |
| --- | --- |
| GET | `/search/?q=` returns `{ tasks, employees, projects }` |
| GET/PATCH | `/organisation/settings/` |
| GET | `/audit-logs/` |
| GET | `/onboarding/` |
| POST | `/onboarding/{caseId}/items/{itemId}/` toggles a checklist item |
| GET | `/offboarding/` |
| GET | `/assets/` |

## TypeScript

Request and response interfaces live in `src/types/index.ts`. Service functions live in `src/lib/api/services.ts`. UI components do not call `fetch` directly.
