from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AdverseEventViewSet

router = DefaultRouter()
router.register(r"adverse-events", AdverseEventViewSet, basename="adverse-events")

urlpatterns = [
    path("", include(router.urls)),
]
