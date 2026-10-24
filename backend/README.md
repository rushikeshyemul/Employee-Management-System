# Workforce Hub — Django REST Framework Backend

Backend API service for Employee Management System (Workforce Hub) built with Django 5.x and Django REST Framework.

## Features
- **Custom User Model & Auth**: Email-based authentication with role and fine-grained permissions; dual-mode SimpleJWT (HttpOnly cookies + Bearer token).
- **Organization Hierarchy**: Departments, Teams, and Projects with leadership relationships.
- **Employee Directory**: Role-based access control, sensitive field gating (`salary_band`, `date_of_birth`), and deactivation workflows.
- **Task Management & Workflows**: State machine engine (`start`, `submit_for_review`, `approve`, `request_changes`, `block`, `unblock`), comments, attachments, events.
- **Attendance & Time Tracking**: Authoritative punch in/out, late arrival detection against company schedule, breaks tracking, and corrections.
- **Leave Management & Ledger**: Exact allowance accounting (`allocated`, `used`, `pending`, `available`), overlap checks, withdrawal, and approvals sync.
- **Approvals Engine**: Multi-role review queue for leave and attendance corrections with HTTP 409 duplicate decision prevention.
- **Notifications**: In-app notifications, read receipts, bulk operations, and configurable category preferences.
- **Analytics & Search**: Role-aware dashboard payload matching frontend schema, drill-down reports, and global search.
- **OpenAPI 3.0 Documentation**: Interactive Swagger UI (`/api/docs/`) and ReDoc (`/api/redoc/`) generated via `drf-spectacular` with 0 warnings/errors.
- **Automated Testing & Quality**: 25/25 Pytest test suite passing in ~21s; 100% formatted with Ruff.

## Quick Start
```powershell
# 1. Activate Virtual Environment
.\.venv\Scripts\Activate.ps1

# 2. Install Dependencies
pip install -r requirements\local.txt

# 3. Environment Variables
Copy-Item .env.example .env

# 4. Run Migrations
python manage.py migrate

# 5. Seed Demo Accounts
python manage.py seed_demo_data

# 6. Start Server
python manage.py runserver 8000
```

## Running Tests & Checks
```powershell
pytest tests/
ruff check .
ruff format --check .
```
