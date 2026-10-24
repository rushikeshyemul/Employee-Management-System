from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import TaskViewSet, WorkflowDefinitionView

router = DefaultRouter()
router.register(r"", TaskViewSet, basename="task")

urlpatterns = [
    path("workflow/", WorkflowDefinitionView.as_view(), name="task-workflow"),
    path(
        "workflow-definition/",
        WorkflowDefinitionView.as_view(),
        name="task-workflow-definition",
    ),
    path("", include(router.urls)),
]
