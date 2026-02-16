import uuid
from django.conf import settings
from django.db import models

from processes.models import Process


class DocumentType(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "document_types"


class Document(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    filename = models.CharField(max_length=255)
    originalname = models.CharField(max_length=255)
    uploader = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="uploaded_documents")
    uploader_name = models.CharField(max_length=200)
    process = models.ForeignKey(Process, on_delete=models.SET_NULL, blank=True, null=True, related_name="documents")
    file_size = models.BigIntegerField(blank=True, null=True)
    mime_type = models.CharField(max_length=120, blank=True, null=True)
    storage_provider = models.CharField(max_length=80, blank=True, null=True)
    storage_path = models.CharField(max_length=400, blank=True, null=True)
    structure_path = models.CharField(max_length=400, blank=True, null=True)
    visibility = models.CharField(max_length=40, blank=True, null=True)
    permissions_json = models.TextField(blank=True, null=True)
    type = models.ForeignKey(DocumentType, on_delete=models.SET_NULL, blank=True, null=True, related_name="documents")
    version = models.CharField(max_length=50, blank=True, null=True)
    status = models.CharField(max_length=40, blank=True, null=True)
    file = models.FileField(upload_to="documents/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "documents"
