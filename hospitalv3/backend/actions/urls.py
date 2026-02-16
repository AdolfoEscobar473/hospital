from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ActionViewSet

router = DefaultRouter()
router.register(r"actions", ActionViewSet, basename="actions")

urlpatterns = [
    path("", include(router.urls)),
]
