from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ClientLogViewSet

router = DefaultRouter()
router.register(r"client-logs", ClientLogViewSet, basename="client-logs")

urlpatterns = [
    path("", include(router.urls)),
]
