import uuid
from django.conf import settings
from django.db import models

from processes.models import Process


class EcosystemRecord(models.Model):
    RECORD_TYPE_CHOICES = (
        ("document", "Document"),
        ("indicator", "Indicator"),
        ("risk", "Risk"),
        ("action", "Action"),
        ("committee", "Committee"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    process = models.ForeignKey(Process, on_delete=models.CASCADE, related_name="ecosystem_records")
    record_type = models.CharField(max_length=60, choices=RECORD_TYPE_CHOICES)
    ref_id = models.UUIDField()
    title = models.CharField(max_length=255)
    status = models.CharField(max_length=80, blank=True, null=True)
    score = models.FloatField(blank=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name="ecosystem_records_created")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "ecosystem_records"
