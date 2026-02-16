from rest_framework import serializers

from .models import (
    AuditLog,
    CatalogItem,
    ColumnSetting,
    EmailLog,
    OAuthConfig,
    RoleConfig,
    RolePermission,
    SMTPConfig,
    StorageConfig,
)


class RolePermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RolePermission
        fields = ["id", "role", "module", "can_read", "can_edit", "can_approve", "can_delete"]


class RoleConfigSerializer(serializers.ModelSerializer):
    permissions = RolePermissionSerializer(many=True, read_only=True)

    class Meta:
        model = RoleConfig
        fields = "__all__"


class CatalogItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CatalogItem
        fields = "__all__"


class ColumnSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ColumnSetting
        fields = "__all__"


class SMTPConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SMTPConfig
        fields = "__all__"


class OAuthConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = OAuthConfig
        fields = "__all__"


class StorageConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = StorageConfig
        fields = "__all__"


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = "__all__"


class EmailLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailLog
        fields = "__all__"
