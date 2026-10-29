import uuid

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.employees.models import Employee
from apps.organisations.models import Department

from .models import EMPLOYEE_ACCOUNT_PERMISSIONS, User
from .serializers import (
    CurrentUserSerializer,
    InviteAcceptSerializer,
    LoginRequestSerializer,
    MessageResponseSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterRequestSerializer,
    TokenRefreshRequestSerializer,
)


def issue_token_response(user, status_code):
    """Return the login payload and set the access and refresh cookies."""
    user = User.objects.select_related("employee_profile").get(pk=user.pk)
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    refresh_token = str(refresh)

    response = Response(
        {
            "user": CurrentUserSerializer(user).data,
            "access": access_token,
            "refresh": refresh_token,
        },
        status=status_code,
    )

    cookie_secure = not settings.DEBUG
    access_max_age = int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds())
    refresh_max_age = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())

    response.set_cookie(
        key=settings.JWT_AUTH_COOKIE,
        value=access_token,
        max_age=access_max_age,
        httponly=True,
        samesite="Lax",
        secure=cookie_secure,
    )
    response.set_cookie(
        key=settings.JWT_AUTH_REFRESH_COOKIE,
        value=refresh_token,
        max_age=refresh_max_age,
        httponly=True,
        samesite="Lax",
        secure=cookie_secure,
    )
    return response


class LoginView(APIView):
    """
    Authenticate user via email and password, returning user profile and tokens.
    Also sets HttpOnly authentication cookies for cookie-based session strategy.
    """

    permission_classes = [permissions.AllowAny]

    @extend_schema(
        request=LoginRequestSerializer,
        responses={
            200: inline_serializer(
                name="LoginSuccessResponse",
                fields={
                    "user": CurrentUserSerializer(),
                },
            ),
            400: MessageResponseSerializer,
        },
    )
    def post(self, request):
        serializer = LoginRequestSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        return issue_token_response(serializer.validated_data["user"], status.HTTP_200_OK)


class RegisterView(APIView):
    """Create an employee account and sign the new user in."""

    permission_classes = [permissions.AllowAny]

    @extend_schema(
        request=RegisterRequestSerializer,
        responses={
            201: inline_serializer(
                name="RegisterSuccessResponse",
                fields={"user": CurrentUserSerializer()},
            ),
            400: MessageResponseSerializer,
        },
    )
    def post(self, request):
        serializer = RegisterRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        preferred_name = (data.get("preferred_name") or "").strip() or None

        with transaction.atomic():
            user = User.objects.create_user(
                email=data["email"],
                password=data["password"],
                first_name=data["first_name"].strip(),
                last_name=data["last_name"].strip(),
                preferred_name=preferred_name,
                role="employee",
                permissions=list(EMPLOYEE_ACCOUNT_PERMISSIONS),
            )
            Employee.objects.create(
                user=user,
                employee_code=f"EMP-{uuid.uuid4().hex[:6].upper()}",
                first_name=user.first_name,
                last_name=user.last_name,
                preferred_name=preferred_name,
                email=user.email,
                job_title="Employee",
                department=Department.objects.order_by("name").first(),
                status="active",
                start_date=timezone.now().date(),
            )

        return issue_token_response(user, status.HTTP_201_CREATED)


class LogoutView(APIView):
    """
    Log out user by clearing authentication cookies and blacklisting the refresh token.
    """

    permission_classes = [permissions.AllowAny]

    @extend_schema(
        request=TokenRefreshRequestSerializer,
        responses={200: MessageResponseSerializer},
    )
    def post(self, request):
        refresh_token = request.data.get("refresh") or request.COOKIES.get(
            settings.JWT_AUTH_REFRESH_COOKIE
        )
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except (TokenError, InvalidToken):
                pass

        response = Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)
        response.delete_cookie(settings.JWT_AUTH_COOKIE)
        response.delete_cookie(settings.JWT_AUTH_REFRESH_COOKIE)
        return response


class TokenRefreshView(APIView):
    """
    Refresh access token using refresh token provided in payload or cookie.
    """

    permission_classes = [permissions.AllowAny]

    @extend_schema(
        request=TokenRefreshRequestSerializer,
        responses={200: inline_serializer(name="RefreshResponse", fields={})},
    )
    def post(self, request):
        raw_refresh = request.data.get("refresh") or request.COOKIES.get(
            settings.JWT_AUTH_REFRESH_COOKIE
        )

        if not raw_refresh:
            return Response(
                {"detail": "Refresh token was not provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            refresh = RefreshToken(raw_refresh)
            new_access = str(refresh.access_token)

            if settings.SIMPLE_JWT.get("ROTATE_REFRESH_TOKENS", False):
                refresh.set_jti()
                refresh.set_exp()
                refresh.set_iat()
                new_refresh = str(refresh)
            else:
                new_refresh = str(raw_refresh)

            response = Response(
                {"access": new_access, "refresh": new_refresh},
                status=status.HTTP_200_OK,
            )

            cookie_secure = not settings.DEBUG
            access_max_age = int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds())
            refresh_max_age = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())

            response.set_cookie(
                key=settings.JWT_AUTH_COOKIE,
                value=new_access,
                max_age=access_max_age,
                httponly=True,
                samesite="Lax",
                secure=cookie_secure,
            )
            response.set_cookie(
                key=settings.JWT_AUTH_REFRESH_COOKIE,
                value=new_refresh,
                max_age=refresh_max_age,
                httponly=True,
                samesite="Lax",
                secure=cookie_secure,
            )
            return response
        except TokenError:
            return Response(
                {"detail": "Token is invalid or expired."},
                status=status.HTTP_401_UNAUTHORIZED,
            )


class CurrentUserView(APIView):
    """
    Retrieve currently authenticated user's profile and permissions.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: CurrentUserSerializer})
    def get(self, request):
        serializer = CurrentUserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PasswordResetView(APIView):
    """Initiate password reset via email."""

    permission_classes = [permissions.AllowAny]

    @extend_schema(
        request=PasswordResetRequestSerializer, responses={200: MessageResponseSerializer}
    )
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Always return the same message to avoid account enumeration
        return Response(
            {"detail": "If the email is registered, password reset instructions have been sent."},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    """Confirm password reset using verification token."""

    permission_classes = [permissions.AllowAny]

    @extend_schema(
        request=PasswordResetConfirmSerializer, responses={200: MessageResponseSerializer}
    )
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            {"detail": "Password has been successfully reset."},
            status=status.HTTP_200_OK,
        )


class InviteAcceptView(APIView):
    """Accept invitation token and setup user credentials."""

    permission_classes = [permissions.AllowAny]

    @extend_schema(request=InviteAcceptSerializer, responses={200: MessageResponseSerializer})
    def post(self, request):
        serializer = InviteAcceptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            {"detail": "Invitation accepted successfully."},
            status=status.HTTP_200_OK,
        )
