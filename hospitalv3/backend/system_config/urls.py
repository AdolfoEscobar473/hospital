from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AuditLogViewSet,
    CatalogItemViewSet,
    ColumnSettingViewSet,
    ConfigLookupView,
    ConfigTestView,
    EmailLogViewSet,
    OAuthConfigView,
    PermissionsBulkView,
    RoleConfigViewSet,
    RolePermissionViewSet,
    SMTPConfigView,
    StorageConfigView,
)

router = DefaultRouter()
router.register(r"roles", RoleConfigViewSet, basename="roles")
router.register(r"role-permissions", RolePermissionViewSet, basename="role-permissions")
router.register(r"catalogs", CatalogItemViewSet, basename="catalogs")
router.register(r"column-settings", ColumnSettingViewSet, basename="column-settings")
router.register(r"logs", AuditLogViewSet, basename="audit-logs")
router.register(r"email-logs", EmailLogViewSet, basename="email-logs")

urlpatterns = [
    path("", include(router.urls)),
    path("config/smtp", SMTPConfigView.as_view(), name="config-smtp"),
    path("config/oauth", OAuthConfigView.as_view(), name="config-oauth"),
    path("config/storage", StorageConfigView.as_view(), name="config-storage"),
    path("config/test", ConfigTestView.as_view(), name="config-test"),
    path("config/lookup", ConfigLookupView.as_view(), name="config-lookup"),
    path("config/permissions-bulk", PermissionsBulkView.as_view(), name="permissions-bulk"),
]
