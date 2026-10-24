# Changelog — Employee Management System

All notable changes to the Employee Management System monorepo are documented in this file.

## [Unreleased] - 2026-10-25

### Added
- **Monorepo Architecture**:
  - Established Django 5.x / Django REST Framework backend foundation inside `backend/`.
  - Configured environment separation (`base.py`, `development.py`, `production.py`) and `.env.example`.
  - Dual PostgreSQL and SQLite database configuration for development and production environments.
- **Custom User Model & Authentication (`apps.accounts`)**:
  - Implemented `accounts.User` model inheriting `AbstractBaseUser` and `PermissionsMixin` prior to initial migrations.
  - Implemented `JWTCookieOrHeaderAuthentication` supporting both HttpOnly cookies (`wf_access`, `wf_refresh`) and standard `Authorization: Bearer <token>` headers.
  - Active authentication endpoints: login, logout, token refresh, current user (`/api/v1/auth/me/`), password reset, and invitation acceptance.
- **Organization Structure (`apps.organisations`)**:
  - Implemented `OrganisationSettings`, `Department`, `Team`, and `Project` models, serializers, and viewsets.
- **Employee Management (`apps.employees`)**:
  - Implemented `Employee` model with full reporting structure, employment status, and employment types.
  - Added object-level and serializer-level field gating to restrict sensitive fields (`salary_band`, `date_of_birth`, private email, emergency contact) to HR administrators.
  - Implemented employee deactivation action with automatic login account deactivation.
- **Task Management & Workflow State Machine (`apps.tasks`)**:
  - Implemented `Task`, `TaskComment`, `TaskEvent`, `TaskAttachment` models and relational structures.
  - Implemented deterministic state transition engine with permission checks (`start`, `submit_for_review`, `approve`, `request_changes`, `block`, `unblock`, `cancel`, `reopen`).
  - Added workflow definition endpoint providing column layouts and state transition rules.
- **Attendance & Clock In/Out Engine (`apps.attendance`)**:
  - Implemented `AttendanceRecord` and `AttendanceCorrection` with authoritative server-side timestamps.
  - Added shift evaluation against company standard start times to flag late arrivals.
  - Built break tracking (start/end) and punch correction workflow linked to approvals.
- **Leave Management & Ledger Accounting (`apps.leave_management`)**:
  - Implemented `LeaveType`, `LeaveBalance`, and `LeaveRequest` models.
  - Built accurate balance ledger model calculating `available_days = allocated - used - pending`.
  - Enforced date ordering, overlap prevention, and automatic days reservation with rollback on withdrawal.
- **Multi-Role Approvals Engine (`apps.approvals`)**:
  - Implemented `Approval` model supporting `leave`, `attendance_correction`, and `hr_request`.
  - Added atomic decision processing (`approve`, `reject`, `request_changes`) with state synchronization and HTTP 409 Conflict protection.
- **Notifications System (`apps.notifications`)**:
  - Implemented `Notification` and `NotificationPreferences` models.
  - Added endpoints for in-app notification center, read receipts, bulk read, and category preferences.
- **Reports & Analytics Dashboard (`apps.reports`)**:
  - Implemented role-aware `/api/v1/reports/dashboard/` returning complete `DashboardResponse` matching frontend schema.
  - Implemented drill-down report endpoints for tasks, attendance, leave, and headcount.
  - Built `/api/v1/search/` global search across tasks, employees, and projects.
- **Testing & Quality Tooling**:
  - Pytest test suite with 25 unit/integration tests across all domain apps passing with 100% success rate.
  - Code linting and formatting passing 102 files with 0 errors via Ruff.
  - OpenAPI 3.0 schema generation with `drf-spectacular` generating 122KB schema with 0 warnings and 0 errors.
  - Management command `seed_demo_data` to initialize demo accounts, leave balances, projects, and tasks.
- **Antigravity Skills**:
  - Created 5 actionable Antigravity skills in `.agent/skills/` and `.agents/skills/`: `backend_development`, `frontend_integration`, `api_contract`, `database_migrations`, and `testing_and_quality`.
- **System Documentation**:
  - Comprehensive documentation in `docs/`: `ARCHITECTURE.md`, `API_CONTRACT.md`, `DATA_MODEL.md`, `AUTHORIZATION.md`, `DEVELOPMENT.md`, `FRONTEND_INTEGRATION.md`, and `CHANGELOG.md`.
