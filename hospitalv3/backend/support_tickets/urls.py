from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import SupportTicketViewSet

router = DefaultRouter()
router.register(r"support", SupportTicketViewSet, basename="support")

urlpatterns = [
    path("", include(router.urls)),
]
