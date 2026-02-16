from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import UserRole

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "name",
            "email",
            "is_active",
            "must_change_password",
            "created_at",
            "roles",
        )
        read_only_fields = ("id", "created_at", "roles")

    def get_roles(self, obj):
        return list(obj.roles_rel.values_list("role", flat=True))


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class RefreshSerializer(serializers.Serializer):
    refreshToken = serializers.CharField()


class ChangePasswordSerializer(serializers.Serializer):
    currentPassword = serializers.CharField()
    newPassword = serializers.CharField(min_length=6)


class ForgotPasswordSerializer(serializers.Serializer):
    identifier = serializers.CharField()


def _validate_password_min_length(value):
    if value and len(value) < 6:
        from rest_framework import serializers as ser
        raise ser.ValidationError("La contrasena debe tener al menos 6 caracteres.")
    return value


class UserCreateUpdateSerializer(serializers.ModelSerializer):
    roles = serializers.ListField(
        child=serializers.ChoiceField(choices=[c[0] for c in UserRole.ROLE_CHOICES]),
        write_only=True,
        required=False,
    )
    password = serializers.CharField(write_only=True, required=False, min_length=6)

    class Meta:
        model = User
        fields = ("id", "username", "name", "email", "is_active", "must_change_password", "password", "roles")
        read_only_fields = ("id",)

    def validate_password(self, value):
        return _validate_password_min_length(value)

    def create(self, validated_data):
        roles = validated_data.pop("roles", [UserRole.ROLE_COLLABORATOR])
        password = validated_data.pop("password", None) or "password"
        _validate_password_min_length(password)
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        UserRole.objects.filter(user=user).delete()
        UserRole.objects.bulk_create([UserRole(user=user, role=r) for r in roles])
        return user

    def update(self, instance, validated_data):
        roles = validated_data.pop("roles", None)
        password = validated_data.pop("password", None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if password:
            _validate_password_min_length(password)
            instance.set_password(password)
        instance.save()
        if roles is not None:
            UserRole.objects.filter(user=instance).delete()
            UserRole.objects.bulk_create([UserRole(user=instance, role=r) for r in roles])
        return instance
