from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import IndicatorViewSet

router = DefaultRouter()
router.register(r"indicators", IndicatorViewSet, basename="indicators")

urlpatterns = [
    path("", include(router.urls)),
]
