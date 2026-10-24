from django.conf import settings
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    CurrentUserSerializer,
    InviteAcceptSerializer,
    LoginRequestSerializer,
    MessageResponseSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    TokenRefreshRequestSerializer,
)


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
        user = serializer.validated_data["user"]

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        user_data = CurrentUserSerializer(user).data
        response_data = {
            "user": user_data,
            "access": access_token,
            "refresh": refresh_token,
        }

        response = Response(response_data, status=status.HTTP_200_OK)

        # Set auth cookies for web browser cookie strategy
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
