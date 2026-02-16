import uuid
from django.conf import settings
from django.db import models


class Process(models.Model):
    CATEGORY_CHOICES = (
        ("direccionamiento_estrategico", "Direccionamiento estrategico"),
        ("proceso_misional", "Proceso misional"),
        ("proceso_apoyo", "Proceso apoyo"),
        ("proceso_evaluacion", "Proceso evaluacion"),
    )

    STATUS_CHOICES = (
        ("activo", "Activo"),
        ("inactivo", "Inactivo"),
        ("en_revision", "En revision"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=80, choices=CATEGORY_CHOICES, default="proceso_misional")
    code = models.CharField(max_length=50, blank=True, null=True)
    responsible = models.CharField(max_length=200, blank=True, null=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name="owned_processes")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name="created_processes")
    status = models.CharField(max_length=40, choices=STATUS_CHOICES, default="activo")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "processes"


class ProcessCharacterization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    process = models.OneToOneField(Process, on_delete=models.CASCADE, related_name="characterization")
    objective = models.TextField(blank=True, null=True)
    scope = models.TextField(blank=True, null=True)
    inputs = models.TextField(blank=True, null=True)
    outputs = models.TextField(blank=True, null=True)
    responsible = models.CharField(max_length=200, blank=True, null=True)
    resources = models.TextField(blank=True, null=True)
    related_documents = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "process_characterization"
