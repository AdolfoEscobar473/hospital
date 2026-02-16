import uuid
from django.db import models

from processes.models import Process


class Risk(models.Model):
    STATUS_CHOICES = (
        ("open", "Open"),
        ("in_progress", "In progress"),
        ("closed", "Closed"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    process = models.ForeignKey(Process, on_delete=models.SET_NULL, blank=True, null=True, related_name="risks")
    severity = models.CharField(max_length=50, blank=True, null=True)
    probability = models.CharField(max_length=50, blank=True, null=True)
    mitigation = models.TextField(blank=True, null=True)
    owner = models.CharField(max_length=200, blank=True, null=True)
    status = models.CharField(max_length=40, choices=STATUS_CHOICES, default="open")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "risks"


class RiskMatrixHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    risk = models.ForeignKey(Risk, on_delete=models.CASCADE, related_name="matrix_history")
    severity = models.IntegerField()
    probability = models.IntegerField()
    recorded_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "risk_matrix_history"
