# Authorization & Permissions Model — Employee Management System

## 1. Overview
Authorization is strictly enforced server-side within Django REST Framework viewsets and permission classes. The frontend UI merely adapts presentation based on permissions returned in `GET /api/v1/auth/me/`.

## 2. Roles
| Role Identifier | Title | Scope of Authority |
|---|---|---|
| `super_admin` | Super Administrator | Full unrestricted administrative authority across the entire organization. |
| `hr_admin` | HR Administrator | Workforce management, department structures, leave policies, and sensitive employee data. |
| `manager` | Department Manager | Team attendance review, leave approvals, team task assignments, and direct reports. |
| `project_manager`| Project Manager | Project creation, task boards, review queues, and sprint workload tracking. |
| `employee` | Employee | Personal profile view/edit, clocking in/out, task transition on assigned items, leave requests. |
| `auditor` | Auditor | Read-only access to audit trail, historical logs, and compliance records. |

## 3. Permission Capabilities Matrix
| Permission String | Description | Employee | Manager | Project Manager | HR Admin | Super Admin |
|---|---|---|---|---|---|---|
| `dashboard.view` | Access main dashboard metrics | Yes | Yes | Yes | Yes | Yes |
| `profile.view` | View own profile details | Yes | Yes | Yes | Yes | Yes |
| `profile.edit_self` | Update own bio, phone, emergency info | Yes | Yes | Yes | Yes | Yes |
| `employees.view` | View corporate employee directory | Yes | Yes | Yes | Yes | Yes |
| `employees.view_team` | View direct report profiles | No | Yes | As permitted | Yes | Yes |
| `employees.manage` | Create and modify employee records | No | No | No | Yes | Yes |
| `employees.deactivate` | Deactivate employment and credentials | No | No | No | Yes | Yes |
| `employees.view_sensitive`| View salary band and date of birth | No | No | No | Yes | Yes |
| `departments.view` | View department listings | Yes | Yes | Yes | Yes | Yes |
| `departments.manage` | Add or update departments | No | No | No | Yes | Yes |
| `projects.view` | View projects catalog | Yes | Yes | Yes | Yes | Yes |
| `projects.manage` | Create and modify projects | No | As permitted | Yes | Yes | Yes |
| `tasks.view_own` | View tasks assigned to self | Yes | Yes | Yes | Yes | Yes |
| `tasks.create` | Create new tasks | As permitted | Yes | Yes | Yes | Yes |
| `tasks.assign` | Assign tasks to team members | No | Yes | Yes | Yes | Yes |
| `attendance.view_own` | View personal attendance log | Yes | Yes | Yes | Yes | Yes |
| `attendance.clock` | Clock in and out | Yes | Yes | Yes | Yes | Yes |
| `attendance.view_team` | View team attendance records | No | Yes | No | Yes | Yes |
| `leave.view_own` | View personal leave balances | Yes | Yes | Yes | Yes | Yes |
| `leave.request` | Submit new leave requests | Yes | Yes | Yes | Yes | Yes |
| `leave.approve` | Approve or reject team leave | No | Yes | No | Yes | Yes |
| `reports.view_team` | View team workload and metrics | No | Yes | Yes | Yes | Yes |
| `reports.view_org` | View company-wide HR analytics | No | No | No | Yes | Yes |

## 4. Object-Level and Field-Level Security Rules
1. **Sensitive Field Omission**: In `EmployeeSerializer.to_representation()`, `salary_band` and `date_of_birth` are automatically stripped from the JSON response unless the caller has `employees.view_sensitive` or is an HR/SuperAdmin.
2. **Contact Privacy**: `personal_email`, `emergency_contact_name`, and `emergency_contact_phone` are visible only to the employee themselves or HR administrators.
3. **Immutability of Privileged Fields**: Normal employees cannot alter their department, manager, employment status, or role via `PATCH /employees/me/`.
