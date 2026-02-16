import uuid
from django.conf import settings
from django.db import models


class RoleConfig(models.Model):
    code = models.CharField(primary_key=True, max_length=50)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "roles_config"

    def __str__(self):
        return self.name


class RolePermission(models.Model):
    """Granular permission: role + module + level (read/edit/approve/delete)."""
    id = models.BigAutoField(primary_key=True)
    role = models.ForeignKey(RoleConfig, on_delete=models.CASCADE, related_name="permissions")
    module = models.CharField(max_length=80)  # e.g. documents, indicators, risks ...
    can_read = models.BooleanField(default=False)
    can_edit = models.BooleanField(default=False)
    can_approve = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)

    class Meta:
        db_table = "role_permissions"
        constraints = [
            models.UniqueConstraint(fields=["role", "module"], name="uq_role_module"),
        ]

    def __str__(self):
        return f"{self.role_id} / {self.module}"


class CatalogItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    catalog_key = models.CharField(max_length=120)
    value = models.CharField(max_length=255)
    label = models.CharField(max_length=255, blank=True, null=True)
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "catalog_items"
        ordering = ["catalog_key", "sort_order", "value"]
        constraints = [
            models.UniqueConstraint(fields=["catalog_key", "value"], name="uq_catalog_key_value"),
        ]


class ColumnSetting(models.Model):
    module = models.CharField(primary_key=True, max_length=120)
    config_json = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "column_settings"


class SMTPConfig(models.Model):
    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    host = models.CharField(max_length=255, blank=True, null=True)
    port = models.PositiveIntegerField(blank=True, null=True)
    username = models.CharField(max_length=255, blank=True, null=True)
    password = models.CharField(max_length=255, blank=True, null=True)
    from_email = models.EmailField(blank=True, null=True)
    from_name = models.CharField(max_length=255, blank=True, null=True)
    use_tls = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "smtp_config"


class OAuthConfig(models.Model):
    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    provider = models.CharField(max_length=50, default="none")
    tenant_id = models.CharField(max_length=255, blank=True, null=True)
    client_id = models.CharField(max_length=255, blank=True, null=True)
    client_secret = models.CharField(max_length=255, blank=True, null=True)
    sender_email = models.EmailField(blank=True, null=True)
    gmail_refresh_token = models.TextField(blank=True, null=True)
    gmail_user = models.CharField(max_length=255, blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "oauth_config"


class StorageConfig(models.Model):
    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    provider = models.CharField(max_length=40, default="local")
    local_path = models.CharField(max_length=255, default="media")
    onedrive_path = models.CharField(max_length=255, blank=True, null=True)
    gdrive_folder = models.CharField(max_length=255, blank=True, null=True)
    gsite_url = models.CharField(max_length=500, blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "storage_config"


class AuditLog(models.Model):
    id = models.BigAutoField(primary_key=True)
    event_type = models.CharField(max_length=120)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name="audit_logs")
    entity_type = models.CharField(max_length=120, blank=True, null=True)
    entity_id = models.CharField(max_length=120, blank=True, null=True)
    status = models.CharField(max_length=40, blank=True, null=True)
    details_json = models.JSONField(blank=True, null=True)
    ip = models.CharField(max_length=80, blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "audit_logs"


class EmailLog(models.Model):
    id = models.BigAutoField(primary_key=True)
    event_type = models.CharField(max_length=120, blank=True, null=True)
    provider = models.CharField(max_length=120, blank=True, null=True)
    to_email = models.EmailField(blank=True, null=True)
    subject = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=40, blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name="email_logs")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "email_logs"
