import uuid
from django.conf import settings
from django.db import models

from processes.models import Process
from risks.models import Risk


class Action(models.Model):
    STATUS_CHOICES = (
        ("open", "Open"),
        ("in_progress", "In progress"),
        ("closed", "Closed"),
    )

    PRIORITY_CHOICES = (
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("critical", "Critical"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    process = models.ForeignKey(Process, on_delete=models.SET_NULL, blank=True, null=True, related_name="actions")
    risk = models.ForeignKey(Risk, on_delete=models.SET_NULL, blank=True, null=True, related_name="actions")
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name="actions_assigned")
    due_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=40, choices=STATUS_CHOICES, default="open")
    priority = models.CharField(max_length=40, choices=PRIORITY_CHOICES, default="medium")
    progress = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    closed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "actions"
