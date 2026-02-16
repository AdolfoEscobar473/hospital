from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ProcessCharacterizationViewSet, ProcessViewSet

router = DefaultRouter()
router.register(r"processes", ProcessViewSet, basename="processes")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "process-characterization/<uuid:pk>",
        ProcessCharacterizationViewSet.as_view({"get": "retrieve", "post": "create", "put": "update"}),
        name="process-characterization",
    ),
]
