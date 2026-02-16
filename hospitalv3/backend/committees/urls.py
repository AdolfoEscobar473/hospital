from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CommitteeSessionViewSet, CommitteeViewSet, CommitmentViewSet

router = DefaultRouter()
router.register(r"committees", CommitteeViewSet, basename="committees")
router.register(r"committee-sessions", CommitteeSessionViewSet, basename="committee-sessions")
router.register(r"commitments", CommitmentViewSet, basename="commitments")

urlpatterns = [
    path("", include(router.urls)),
]
