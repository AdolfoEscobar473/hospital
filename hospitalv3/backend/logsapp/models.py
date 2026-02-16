import uuid
from django.db import models


class ClientLog(models.Model):
    LEVEL_CHOICES = (
        ("info", "Info"),
        ("warn", "Warn"),
        ("error", "Error"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default="error")
    message = models.TextField()
    context = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "client_logs"
