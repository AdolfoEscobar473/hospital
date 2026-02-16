import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, blank=True, default="")
    email = models.EmailField(blank=True, null=True)
    must_change_password = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "users"

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = self.get_full_name().strip() or self.username
        super().save(*args, **kwargs)


class UserRole(models.Model):
    ROLE_ADMIN = "admin"
    ROLE_LEADER = "leader"
    ROLE_COLLABORATOR = "collaborator"
    ROLE_READER = "reader"

    ROLE_CHOICES = (
        (ROLE_ADMIN, "Admin"),
        (ROLE_LEADER, "Leader"),
        (ROLE_COLLABORATOR, "Collaborator"),
        (ROLE_READER, "Reader"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="roles_rel")
    role = models.CharField(max_length=50, choices=ROLE_CHOICES)

    class Meta:
        db_table = "user_roles"
        constraints = [
            models.UniqueConstraint(fields=["user", "role"], name="uq_user_role"),
        ]


class RefreshTokenRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="refresh_tokens")
    token = models.TextField(unique=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "refresh_tokens"
