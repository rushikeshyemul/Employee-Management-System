from django.urls import path

from .views import (
    CurrentUserView,
    InviteAcceptView,
    LoginView,
    LogoutView,
    PasswordResetConfirmView,
    PasswordResetView,
    RegisterView,
    TokenRefreshView,
)

app_name = "accounts"

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("me/", CurrentUserView.as_view(), name="me"),
    path("password-reset/", PasswordResetView.as_view(), name="password-reset"),
    path(
        "password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"
    ),
    path("invitations/accept/", InviteAcceptView.as_view(), name="invite-accept"),
]
