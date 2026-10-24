from .base import *  # noqa

DEBUG = True

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# In local development, also allow 127.0.0.1:3000 and 5173 for convenience
CORS_ALLOW_ALL_ORIGINS = DEBUG
