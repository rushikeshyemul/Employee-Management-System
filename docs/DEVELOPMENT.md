# Local Development Guide — Employee Management System

## 1. Prerequisites
- **Python**: 3.12 (compatible with 3.12+)
- **Node.js**: Node 24 and npm 11
- **Database**: PostgreSQL 18 (default port `5432`) or SQLite for local dev
- **Git**

## 2. Backend Setup
1. **Navigate to the backend directory and activate virtual environment**:
   ```powershell
   cd backend
   py -3.12 -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```
2. **Install dependencies**:
   ```powershell
   pip install -r requirements\local.txt
   ```
3. **Configure environment variables**:
   ```powershell
   Copy-Item .env.example .env
   ```
   If using local PostgreSQL:
   ```dotenv
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/employee_management_system
   ```
   If PostgreSQL is not running, leave `DATABASE_URL` blank to safely fall back to local SQLite (`db.sqlite3`).
4. **Apply database migrations**:
   ```powershell
   python manage.py migrate
   ```
5. **Seed demo development accounts**:
   ```powershell
   python manage.py seed_demo_data
   ```
   This seeds the standard accounts with password `WorkforceHub1!`:
   - `super.admin@helios.example` (Super Admin)
   - `hr.admin@helios.example` (HR Admin)
   - `manager@helios.example` (Manager)
   - `project.manager@helios.example` (Project Manager)
   - `employee@helios.example` (Employee)
6. **Run the development server**:
   ```powershell
   python manage.py runserver 8000
   ```
   Open `http://localhost:8000/api/docs/` for interactive Swagger UI.

## 3. Frontend Setup
1. **Navigate to frontend directory**:
   ```powershell
   cd frontend
   npm install
   Copy-Item .env.example .env.local
   ```
2. **Configure API Mode**:
   In `frontend/.env.local`:
   ```bash
   NEXT_PUBLIC_DATA_MODE=api
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
   NEXT_PUBLIC_AUTH_STRATEGY=cookie
   ```
3. **Run the frontend development server**:
   ```powershell
   npm run dev
   ```
   Open `http://localhost:3000` to log in with any seeded demo account.

## 4. Running Quality Checks & Tests
- **Backend Tests**:
  ```powershell
  .\backend\.venv\Scripts\pytest backend/tests/
  ```
- **Linting & Formatting (Ruff)**:
  ```powershell
  .\backend\.venv\Scripts\ruff check backend/
  .\backend\.venv\Scripts\ruff format --check backend/
  ```
- **OpenAPI Schema Verification**:
  ```powershell
  .\backend\.venv\Scripts\python backend/manage.py spectacular --file backend/schema.yml
  ```
