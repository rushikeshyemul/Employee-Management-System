from datetime import datetime

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.attendance.models import AttendanceCorrection, AttendanceRecord
from apps.attendance.views import get_or_create_employee_for_user
from apps.common.exceptions import ConflictError
from apps.leave_management.models import LeaveBalance, LeaveRequest

from .models import Approval
from .serializers import ApprovalDecisionRequestSerializer, ApprovalSerializer


class ApprovalViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Approval.objects.all().select_related("employee", "approver", "decided_by")
    serializer_class = ApprovalSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["type", "status"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        emp = getattr(user, "employee_profile", None)
        is_hr = user.role in ("super_admin", "hr_admin") or user.is_superuser
        is_manager = user.role == "manager"

        # In list inbox, default to open items only unless include_closed=1
        if self.action == "list":
            include_closed = self.request.query_params.get("include_closed")
            status_filter = self.request.query_params.get("status")
            if not include_closed and not status_filter:
                qs = qs.filter(status__in=["pending", "changes_requested"])

        type_filter = self.request.query_params.get("type")
        if type_filter:
            qs = qs.filter(type=type_filter)

        employee_filter = self.request.query_params.get("employee")
        if employee_filter:
            qs = qs.filter(employee_id=employee_filter)

        date_from = self.request.query_params.get("from")
        date_to = self.request.query_params.get("to")
        if date_from:
            qs = qs.filter(submitted_at__date__gte=datetime.strptime(date_from, "%Y-%m-%d").date())
        if date_to:
            qs = qs.filter(submitted_at__date__lte=datetime.strptime(date_to, "%Y-%m-%d").date())

        # Scoping: HR views all, Managers view their reports, employees view their own
        if not is_hr and is_manager and emp:
            qs = qs.filter(Q(approver=emp) | Q(employee__manager=emp))
        elif not is_hr and not is_manager and emp:
            qs = qs.filter(employee=emp)

        return qs

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def decision(self, request, pk=None):
        """Record an approval decision (approve, reject, request_changes)."""
        approval = self.get_object()

        if approval.status in ("approved", "rejected"):
            raise ConflictError("This approval has already reached a final decision.")

        serializer = ApprovalDecisionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        decision = serializer.validated_data["decision"]
        comment = serializer.validated_data.get("comment", "").strip()

        if decision in ("reject", "request_changes") and not comment:
            return Response(
                {"comment": ["A comment is required when rejecting or requesting changes."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        decider = get_or_create_employee_for_user(request.user)
        is_hr = request.user.role in ("super_admin", "hr_admin") or request.user.is_superuser
        if not is_hr and approval.approver != decider:
            return Response(
                {"detail": "You do not have permission to decide this approval."},
                status=status.HTTP_403_FORBIDDEN,
            )

        now = timezone.now()

        approval.status = (
            "approved"
            if decision == "approve"
            else ("rejected" if decision == "reject" else "changes_requested")
        )
        approval.decided_at = now
        approval.decided_by = decider
        approval.comment = comment

        # Add history entry
        approval.history.append(
            {
                "at": now.isoformat(),
                "actor": decider.display_name,
                "message": f"Decision: {decision.replace('_', ' ').title()}{f' - {comment}' if comment else ''}",
            }
        )
        approval.save()

        # Synchronize target business entity
        if approval.type == "leave":
            leave_req = LeaveRequest.objects.filter(id=approval.subject_id).first()
            if leave_req:
                leave_req.status = (
                    approval.status if approval.status != "changes_requested" else "pending"
                )
                leave_req.decided_at = now
                leave_req.decided_by = decider
                leave_req.reviewer_comment = comment
                leave_req.save()

                balance = LeaveBalance.objects.filter(
                    employee=leave_req.employee, leave_type=leave_req.leave_type
                ).first()
                if balance:
                    if decision == "approve":
                        balance.pending_days = max(0.0, balance.pending_days - leave_req.days)
                        balance.used_days += leave_req.days
                    elif decision == "reject":
                        balance.pending_days = max(0.0, balance.pending_days - leave_req.days)
                    balance.save(update_fields=["pending_days", "used_days", "updated_at"])

        elif approval.type == "attendance_correction":
            corr = AttendanceCorrection.objects.filter(id=approval.subject_id).first()
            if corr:
                corr.status = (
                    approval.status if approval.status != "changes_requested" else "pending"
                )
                corr.decided_at = now
                corr.decided_by = decider
                corr.reviewer_comment = comment
                corr.save()

                if decision == "approve":
                    rec = AttendanceRecord.objects.filter(
                        employee=corr.employee, date=corr.date
                    ).first()
                    if rec:
                        if corr.requested_clock_in_at:
                            rec.clock_in_at = corr.requested_clock_in_at
                        if corr.requested_clock_out_at:
                            rec.clock_out_at = corr.requested_clock_out_at
                        rec.save()

        output_serializer = ApprovalSerializer(approval)
        return Response(output_serializer.data, status=status.HTTP_200_OK)
