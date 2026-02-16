from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DocumentTypeViewSet, DocumentViewSet

router = DefaultRouter()
router.register(r"documents", DocumentViewSet, basename="documents")
router.register(r"document-types", DocumentTypeViewSet, basename="document-types")

urlpatterns = [
    path("", include(router.urls)),
]
