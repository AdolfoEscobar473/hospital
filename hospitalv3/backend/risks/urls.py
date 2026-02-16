from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import RiskViewSet

router = DefaultRouter()
router.register(r"risks", RiskViewSet, basename="risks")

urlpatterns = [
    path("", include(router.urls)),
]
