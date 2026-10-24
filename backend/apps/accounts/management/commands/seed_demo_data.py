from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.approvals.models import Approval
from apps.attendance.models import AttendanceRecord
from apps.employees.models import Employee
from apps.leave_management.models import LeaveBalance, LeaveRequest, LeaveType
from apps.notifications.models import Notification
from apps.organisations.models import Department, OrganisationSettings, Project, Team
from apps.tasks.models import Task

DEMO_PASSWORD = "WorkforceHub1!"

ALL_PERMISSIONS = [
    "dashboard.view",
    "tasks.view_own",
    "tasks.view_team",
    "tasks.view_all",
    "tasks.create",
    "tasks.assign",
    "tasks.review",
    "tasks.comment",
    "tasks.transition_own",
    "projects.view",
    "projects.manage",
    "attendance.view_own",
    "attendance.clock",
    "attendance.request_correction",
    "attendance.view_team",
    "attendance.manage",
    "leave.view_own",
    "leave.request",
    "leave.view_team",
    "leave.approve",
    "leave.manage",
    "approvals.view",
    "approvals.decide",
    "notifications.view",
    "profile.view",
    "profile.edit_self",
    "employees.view_team",
    "employees.view",
    "employees.manage",
    "employees.deactivate",
    "employees.view_sensitive",
    "reports.view_team",
    "reports.view_org",
    "departments.view",
    "departments.manage",
    "onboarding.view",
    "settings.view",
    "settings.manage",
    "audit.view",
    "roles.view",
    "roles.manage",
]


class Command(BaseCommand):
    help = "Seeds standard demo accounts and organization data matching frontend requirements"

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Seeding demo data...")

        # 1. Organisation Settings
        org, _ = OrganisationSettings.objects.get_or_create(
            id=1,
            defaults={
                "name": "Helios Industries",
                "legal_name": "Helios Industries Ltd.",
                "timezone": "UTC",
                "work_week": [1, 2, 3, 4, 5],
                "standard_start": "09:00",
                "breaks_enabled": True,
                "date_format": "YYYY-MM-DD",
            },
        )

        # 2. Departments
        eng, _ = Department.objects.get_or_create(
            code="ENG",
            defaults={"name": "Engineering", "description": "Product engineering and platform."},
        )
        prod, _ = Department.objects.get_or_create(
            code="PROD",
            defaults={"name": "Product", "description": "Product design and roadmap."},
        )
        people, _ = Department.objects.get_or_create(
            code="PEOPLE",
            defaults={"name": "People Operations", "description": "Human resources and talent."},
        )

        # 3. Teams
        platform_team, _ = Team.objects.get_or_create(
            name="Platform Engineering",
            department=eng,
            defaults={"description": "Core infrastructure and backend systems."},
        )
        apps_team, _ = Team.objects.get_or_create(
            name="Applications",
            department=eng,
            defaults={"description": "Workforce Hub frontend and web applications."},
        )

        # 4. Projects
        Project.objects.get_or_create(
            key="PRJ-HUB",
            department=eng,
            defaults={
                "name": "Workforce Hub Platform",
                "description": "Internal employee management system rewrite.",
                "status": "active",
                "start_date": timezone.now().date(),
            },
        )

        # 5. Accounts and Employee Profiles
        accounts_spec = [
            (
                "super.admin@helios.example",
                "Anika",
                "Patel",
                "super_admin",
                ALL_PERMISSIONS,
                "Vice President of Technology",
                eng,
                platform_team,
                True,
            ),
            (
                "hr.admin@helios.example",
                "Priya",
                "Nair",
                "hr_admin",
                [
                    p
                    for p in ALL_PERMISSIONS
                    if not p.startswith("tasks.create") and not p.startswith("tasks.assign")
                ],
                "Head of People Operations",
                people,
                None,
                True,
            ),
            (
                "manager@helios.example",
                "Rohan",
                "Mehta",
                "manager",
                [
                    "dashboard.view",
                    "tasks.view_all",
                    "tasks.create",
                    "tasks.assign",
                    "tasks.review",
                    "tasks.comment",
                    "attendance.view_own",
                    "attendance.view_team",
                    "attendance.clock",
                    "leave.view_own",
                    "leave.view_team",
                    "leave.approve",
                    "approvals.view",
                    "approvals.decide",
                    "employees.view",
                    "employees.view_team",
                    "reports.view_team",
                ],
                "Engineering Manager",
                eng,
                platform_team,
                False,
            ),
            (
                "project.manager@helios.example",
                "Daniel",
                "Brooks",
                "project_manager",
                [
                    "dashboard.view",
                    "tasks.view_all",
                    "tasks.create",
                    "tasks.assign",
                    "tasks.review",
                    "tasks.comment",
                    "projects.view",
                    "projects.manage",
                    "employees.view",
                    "reports.view_team",
                ],
                "Senior Technical Project Manager",
                prod,
                None,
                False,
            ),
            (
                "employee@helios.example",
                "Meera",
                "Kapoor",
                "employee",
                [
                    "dashboard.view",
                    "tasks.view_own",
                    "tasks.comment",
                    "tasks.transition_own",
                    "attendance.view_own",
                    "attendance.clock",
                    "attendance.request_correction",
                    "leave.view_own",
                    "leave.request",
                    "notifications.view",
                    "profile.view",
                    "profile.edit_self",
                    "employees.view",
                ],
                "Full Stack Software Engineer",
                eng,
                apps_team,
                False,
            ),
        ]

        count = 100
        for (
            email,
            first_name,
            last_name,
            role,
            perms,
            job_title,
            dept,
            team,
            is_staff,
        ) in accounts_spec:
            count += 1
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "first_name": first_name,
                    "last_name": last_name,
                    "role": role,
                    "permissions": perms,
                    "is_staff": is_staff,
                    "is_superuser": role == "super_admin",
                },
            )
            user.set_password(DEMO_PASSWORD)
            user.save()

            emp, _ = Employee.objects.get_or_create(
                email=email,
                defaults={
                    "user": user,
                    "employee_code": f"EMP-{count}",
                    "first_name": first_name,
                    "last_name": last_name,
                    "job_title": job_title,
                    "department": dept,
                    "team": team,
                    "employment_type": "full_time",
                    "status": "active",
                    "location": "London Headquarters",
                    "start_date": timezone.now().date(),
                    "salary_band": "Band-5" if is_staff else "Band-3",
                    "date_of_birth": "1992-04-18",
                },
            )

        # 6. Leave Types & Balances
        lt_annual, _ = LeaveType.objects.get_or_create(
            code="annual", defaults={"name": "Annual Leave", "description": "Standard vacation."}
        )
        lt_sick, _ = LeaveType.objects.get_or_create(
            code="sick", defaults={"name": "Sick Leave", "description": "Medical leave."}
        )
        lt_casual, _ = LeaveType.objects.get_or_create(
            code="casual",
            defaults={"name": "Casual Leave", "description": "Short personal absence."},
        )

        all_employees = Employee.objects.all()
        for e in all_employees:
            LeaveBalance.objects.get_or_create(
                employee=e,
                leave_type=lt_annual,
                defaults={"allocated_days": 20.0, "used_days": 2.0, "pending_days": 1.0},
            )
            LeaveBalance.objects.get_or_create(
                employee=e,
                leave_type=lt_sick,
                defaults={"allocated_days": 10.0, "used_days": 0.0, "pending_days": 0.0},
            )
            LeaveBalance.objects.get_or_create(
                employee=e,
                leave_type=lt_casual,
                defaults={"allocated_days": 5.0, "used_days": 1.0, "pending_days": 0.0},
            )

        # 7. Sample Tasks
        hub_project = Project.objects.filter(key="PRJ-HUB").first()
        dev_emp = Employee.objects.filter(email="employee@helios.example").first()
        mgr_emp = Employee.objects.filter(email="manager@helios.example").first()

        if hub_project and dev_emp and mgr_emp:
            sample_tasks = [
                ("PRJ-HUB-1", "Design responsive design system", "in_progress", "high"),
                ("PRJ-HUB-2", "Implement JWT Session Token Refresh", "done", "urgent"),
                ("PRJ-HUB-3", "Setup Vitest Unit Test Framework", "done", "medium"),
                ("PRJ-HUB-4", "Develop Attendance Timesheet Widget", "in_review", "high"),
                (
                    "PRJ-HUB-5",
                    "Refactor Approvals Inbox Filter Query",
                    "changes_requested",
                    "medium",
                ),
                ("PRJ-HUB-6", "Add Multi-step Leave Approval Logic", "todo", "medium"),
                ("PRJ-HUB-7", "Optimize Headcount Report SQL Aggregation", "backlog", "low"),
            ]
            for key, title, task_status, priority in sample_tasks:
                Task.objects.get_or_create(
                    key=key,
                    defaults={
                        "title": title,
                        "description": f"Implementation details for {title}.",
                        "project": hub_project,
                        "department": hub_project.department,
                        "assignee": dev_emp,
                        "reporter": mgr_emp,
                        "reviewer": mgr_emp,
                        "status": task_status,
                        "priority": priority,
                        "due_date": timezone.now().date(),
                    },
                )

            # 8. Sample Attendance
            today = timezone.now().date()
            AttendanceRecord.objects.get_or_create(
                employee=dev_emp,
                date=today,
                defaults={
                    "department": dev_emp.department,
                    "clock_in_at": timezone.now(),
                    "status": "present",
                    "worked_minutes": 240,
                    "timezone": "UTC",
                },
            )

            # 9. Sample Leave Request and Approval
            leave_req, _ = LeaveRequest.objects.get_or_create(
                employee=dev_emp,
                start_date=today,
                end_date=today,
                defaults={
                    "department": dev_emp.department,
                    "leave_type": lt_annual,
                    "days": 1.0,
                    "reason": "Personal appointment",
                    "status": "pending",
                },
            )
            Approval.objects.get_or_create(
                subject_id=leave_req.id,
                defaults={
                    "type": "leave",
                    "employee": dev_emp,
                    "approver": mgr_emp,
                    "title": f"Leave Request: {dev_emp.display_name}",
                    "summary": f"1 day Annual Leave requested for {today}",
                    "status": "pending",
                    "context": [
                        {"label": "Days", "value": "1.0"},
                        {"label": "Type", "value": "Annual Leave"},
                    ],
                },
            )

            # 10. Notifications
            Notification.objects.get_or_create(
                recipient=dev_emp.user,
                title="Task Review Requested",
                defaults={
                    "category": "task",
                    "body": "PRJ-HUB-4 Attendance Timesheet is awaiting review.",
                    "href": "/tasks",
                },
            )
            Notification.objects.get_or_create(
                recipient=mgr_emp.user,
                title="New Leave Request",
                defaults={
                    "category": "approval",
                    "body": f"{dev_emp.display_name} requested leave for {today}.",
                    "href": "/approvals",
                },
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded comprehensive demo data with password '{DEMO_PASSWORD}'."
            )
        )
