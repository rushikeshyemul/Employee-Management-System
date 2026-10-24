from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication


class JWTCookieOrHeaderAuthentication(JWTAuthentication):
    """
    Extends Simple JWT authentication to support both:
    1. Standard `Authorization: Bearer <token>` header
    2. HttpOnly / Session cookie `wf_access` (configurable via settings.JWT_AUTH_COOKIE)
    """

    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)
        else:
            cookie_name = getattr(settings, "JWT_AUTH_COOKIE", "wf_access")
            raw_token = request.COOKIES.get(cookie_name)

        if raw_token is None:
            return None

        if isinstance(raw_token, str):
            raw_token = raw_token.encode("utf-8")

        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token


try:
    from drf_spectacular.extensions import OpenApiAuthenticationExtension

    class JWTCookieOrHeaderScheme(OpenApiAuthenticationExtension):
        target_class = "apps.accounts.authentication.JWTCookieOrHeaderAuthentication"
        name = "jwtAuth"

        def get_security_definition(self, auto_schema):
            return {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT",
                "description": "JWT Authorization header using Bearer scheme or HttpOnly session cookie 'wf_access'.",
            }
except ImportError:
    pass
