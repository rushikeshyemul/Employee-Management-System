# Employee Management System (Workforce Hub)

Full-stack enterprise Human Resource Management System (HRMS) built as a monorepo containing a Next.js 15+ frontend and a Django REST Framework backend.

## Repository Structure
```text
Employee-Management-System/
├── frontend/                         # Next.js frontend application (App Router, Tailwind CSS, Radix UI)
├── backend/                          # Django REST Framework backend service
├── docs/                             # Architecture, contract, and workflow documentation
│   ├── ARCHITECTURE.md               # High-level architecture and system workflows
│   ├── API_CONTRACT.md               # Backend API endpoints catalog & specifications
│   ├── DATA_MODEL.md                 # Database schema, entities, and ERD diagram
│   ├── AUTHORIZATION.md              # Role-based access control (RBAC) & permissions
│   ├── DEVELOPMENT.md                # Step-by-step local development setup guide
│   ├── FRONTEND_INTEGRATION.md       # Integration guide for frontend developers & agents
│   └── CHANGELOG.md                  # Chronological release and feature changelog
├── .agent/skills/ & .agents/skills/  # Antigravity developer skills for agent workflows
├── .gitignore
└── README.md
```

## Quick Start

### 1. Backend Service (DRF)
```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements\local.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py seed_demo_data
python manage.py runserver 8000
```
- API Base URL: `http://localhost:8000/api/v1/`
- Interactive Swagger UI: `http://localhost:8000/api/docs/`
- ReDoc: `http://localhost:8000/api/redoc/`

### 2. Frontend Application (Next.js)
```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```
Open `http://localhost:3000` to access the application.

### Demo User Accounts
All seeded accounts use password: `WorkforceHub1!`
- **Super Admin**: `super.admin@helios.example`
- **HR Admin**: `hr.admin@helios.example`
- **Manager**: `manager@helios.example`
- **Project Manager**: `project.manager@helios.example`
- **Employee**: `employee@helios.example`

## Documentation & Skills
- [System Architecture](docs/ARCHITECTURE.md)
- [API Contract](docs/API_CONTRACT.md)
- [Data Model & ERD](docs/DATA_MODEL.md)
- [Authorization & RBAC](docs/AUTHORIZATION.md)
- [Local Development Guide](docs/DEVELOPMENT.md)
- [Frontend Integration Guide](docs/FRONTEND_INTEGRATION.md)
- [Antigravity Skills](.agent/skills/)
