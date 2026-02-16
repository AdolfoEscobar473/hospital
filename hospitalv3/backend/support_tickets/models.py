import uuid
from django.conf import settings
from django.db import models


class SupportTicket(models.Model):
    STATUS_CHOICES = (
        ("open", "Open"),
        ("in_progress", "In progress"),
        ("closed", "Closed"),
    )

    PRIORITY_CHOICES = (
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    email = models.EmailField()
    module = models.CharField(max_length=120, blank=True, null=True)
    priority = models.CharField(max_length=40, choices=PRIORITY_CHOICES, default="medium")
    subject = models.CharField(max_length=255)
    message = models.TextField()
    status = models.CharField(max_length=40, choices=STATUS_CHOICES, default="open")
    response = models.TextField(blank=True, null=True)
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name="support_tickets_assigned")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="support_tickets_created",
        help_text="Usuario que creó el ticket (sesión); si es anónimo queda vacío.",
    )
    attachment = models.FileField(upload_to="support_tickets/%Y/%m/", blank=True, null=True, max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "support_tickets"
