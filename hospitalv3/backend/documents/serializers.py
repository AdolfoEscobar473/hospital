from rest_framework import serializers

from .models import Document, DocumentType


class DocumentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentType
        fields = ("id", "name", "created_at", "updated_at")


class DocumentSerializer(serializers.ModelSerializer):
    processId = serializers.UUIDField(source="process_id", read_only=True)
    uploaderId = serializers.UUIDField(source="uploader_id", read_only=True)
    uploaderName = serializers.CharField(source="uploader_name", read_only=True)
    fileSize = serializers.IntegerField(source="file_size", read_only=True)
    mimeType = serializers.CharField(source="mime_type", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    type = serializers.PrimaryKeyRelatedField(
        queryset=DocumentType.objects.all(), allow_null=True, required=False
    )
    file = serializers.FileField(allow_null=True, required=False)
    filename = serializers.CharField(required=False, allow_blank=True)
    originalname = serializers.CharField(required=False, allow_blank=True)

    def to_internal_value(self, data):
        if isinstance(data, dict):
            for key in ("type", "processId", "process_id"):
                if key in data and data[key] == "":
                    data = {k: v for k, v in data.items()}
                    data[key] = None
        return super().to_internal_value(data)

    class Meta:
        model = Document
        fields = (
            "id",
            "filename",
            "originalname",
            "processId",
            "uploaderId",
            "uploaderName",
            "fileSize",
            "mimeType",
            "storage_provider",
            "storage_path",
            "structure_path",
            "visibility",
            "permissions_json",
            "version",
            "status",
            "createdAt",
            "file",
            "type",
        )
