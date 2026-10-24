from rest_framework.exceptions import ValidationError

from .models import Task, TaskEvent

ACTION_CONFIG = {
    "accept": {
        "label": "Accept Assignment",
        "allowed_from": ["backlog", "todo", "in_progress", "changes_requested"],
        "requires_comment": False,
    },
    "request_clarification": {
        "label": "Request Clarification",
        "allowed_from": ["backlog", "todo", "in_progress", "changes_requested"],
        "requires_comment": True,
    },
    "reject_assignment": {
        "label": "Reject Assignment",
        "allowed_from": ["backlog", "todo", "in_progress", "changes_requested"],
        "requires_comment": True,
    },
    "start": {
        "label": "Start Work",
        "to": "in_progress",
        "allowed_from": ["backlog", "todo", "changes_requested"],
        "requires_comment": False,
    },
    "submit_for_review": {
        "label": "Submit for Review",
        "to": "in_review",
        "allowed_from": ["in_progress"],
        "requires_comment": False,
    },
    "approve": {
        "label": "Approve & Mark Done",
        "to": "done",
        "allowed_from": ["in_review"],
        "requires_comment": False,
    },
    "request_changes": {
        "label": "Request Changes",
        "to": "changes_requested",
        "allowed_from": ["in_review"],
        "requires_comment": True,
    },
    "resume": {
        "label": "Resume Work",
        "to": "in_progress",
        "allowed_from": ["changes_requested"],
        "requires_comment": False,
    },
    "block": {
        "label": "Block Task",
        "to": "blocked",
        "allowed_from": ["backlog", "todo", "in_progress", "changes_requested"],
        "requires_comment": True,
    },
    "unblock": {
        "label": "Unblock Task",
        "to": "in_progress",
        "allowed_from": ["blocked"],
        "requires_comment": False,
    },
    "move_to_backlog": {
        "label": "Move to Backlog",
        "to": "backlog",
        "allowed_from": ["todo", "in_progress"],
        "requires_comment": False,
    },
    "move_to_todo": {
        "label": "Move to To Do",
        "to": "todo",
        "allowed_from": ["backlog"],
        "requires_comment": False,
    },
    "reopen": {
        "label": "Reopen Task",
        "to": "todo",
        "allowed_from": ["done"],
        "requires_comment": False,
    },
}


def get_available_actions(task: Task, actor=None) -> list[dict]:
    """Calculate list of legal workflow actions available for the task."""
    actions = []
    current_status = task.status

    for action_key, config in ACTION_CONFIG.items():
        if current_status in config["allowed_from"]:
            actions.append(
                {
                    "action": action_key,
                    "label": config["label"],
                    "to": config.get("to"),
                    "requires_comment": config["requires_comment"],
                }
            )
    return actions


def apply_task_transition(task: Task, action: str, comment: str = "", actor=None) -> Task:
    """Execute validated status machine transition."""
    if action not in ACTION_CONFIG:
        raise ValidationError({"action": [f"Unknown action '{action}'."]})

    cfg = ACTION_CONFIG[action]
    if task.status not in cfg["allowed_from"]:
        raise ValidationError(
            {
                "detail": f"Action '{action}' is not permitted while task is in '{task.status}' status."
            }
        )

    if cfg["requires_comment"] and (not comment or len(comment.strip()) < 3):
        raise ValidationError({"comment": ["A comment of at least 3 characters is required."]})

    old_status = task.status

    if action == "accept":
        task.assignment_state = "accepted"
    elif action == "request_clarification":
        task.assignment_state = "clarification_requested"
        task.clarification_note = comment
    elif action == "reject_assignment":
        task.assignment_state = "rejected"
        task.rejection_reason = comment
    elif action == "block":
        task.blocked_from = old_status
        task.block_reason = comment
        task.status = "blocked"
    elif action == "unblock":
        task.status = task.blocked_from or "in_progress"
        task.blocked_from = None
        task.block_reason = None
    else:
        if "to" in cfg:
            task.status = cfg["to"]

    task.save()

    # Record event in activity history
    if actor:
        msg = f"Transitioned task via '{action}' from '{old_status}' to '{task.status}'."
        if comment:
            msg += f" Note: {comment}"
        TaskEvent.objects.create(task=task, actor=actor, message=msg)

    return task
