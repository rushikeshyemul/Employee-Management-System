from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.views import exception_handler


class ConflictError(APIException):
    """Exception for state conflicts (HTTP 409), such as deciding on already final approvals."""

    status_code = status.HTTP_409_CONFLICT
    default_detail = "The request could not be completed due to a conflict with the current state."
    default_code = "conflict"


def custom_exception_handler(exc, context):
    """
    Custom exception handler guaranteeing DRF error formatting:
    - { "detail": "..." } or field maps { "field": ["..."], "non_field_errors": ["..."] }
    """
    response = exception_handler(exc, context)

    if response is not None:
        # Standardize single-string errors into standard detail or format
        if isinstance(response.data, list):
            response.data = {"non_field_errors": response.data}
        elif isinstance(response.data, str):
            response.data = {"detail": response.data}

    return response
