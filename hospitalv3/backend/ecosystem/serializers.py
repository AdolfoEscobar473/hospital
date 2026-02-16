from rest_framework import serializers

from .models import EcosystemRecord


class EcosystemRecordSerializer(serializers.ModelSerializer):
    processId = serializers.UUIDField(source="process_id")
    refId = serializers.UUIDField(source="ref_id")
    recordType = serializers.CharField(source="record_type")
    createdBy = serializers.UUIDField(source="created_by_id", allow_null=True, read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = EcosystemRecord
        fields = (
            "id",
            "processId",
            "recordType",
            "refId",
            "title",
            "status",
            "score",
            "createdBy",
            "createdAt",
            "updatedAt",
        )
