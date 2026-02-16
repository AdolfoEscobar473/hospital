from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import EcosystemRecordViewSet

router = DefaultRouter()
router.register(r"ecosystem", EcosystemRecordViewSet, basename="ecosystem")

urlpatterns = [
    path("", include(router.urls)),
]
