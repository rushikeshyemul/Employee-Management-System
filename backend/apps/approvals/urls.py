from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ApprovalViewSet

router = DefaultRouter()
router.register(r"", ApprovalViewSet, basename="approval")

urlpatterns = [
    path("inbox/", ApprovalViewSet.as_view({"get": "list"}), name="approvals-inbox"),
    path("", include(router.urls)),
]
