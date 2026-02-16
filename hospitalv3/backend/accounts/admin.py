from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import RefreshTokenRecord, User, UserRole


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ("username", "name", "email", "is_active", "must_change_password")
    fieldsets = DjangoUserAdmin.fieldsets + (
        ("SGI", {"fields": ("name", "must_change_password")}),
    )


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ("user", "role")
    list_filter = ("role",)


@admin.register(RefreshTokenRecord)
class RefreshTokenRecordAdmin(admin.ModelAdmin):
    list_display = ("user", "created_at", "expires_at")
