from rest_framework import serializers

from .models import Process, ProcessCharacterization


class ProcessSerializer(serializers.ModelSerializer):
    ownerId = serializers.UUIDField(source="owner_id", read_only=True)
    createdBy = serializers.UUIDField(source="created_by_id", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = Process
        fields = (
            "id",
            "name",
            "description",
            "category",
            "code",
            "responsible",
            "ownerId",
            "createdBy",
            "status",
            "createdAt",
            "updatedAt",
        )


class ProcessCharacterizationSerializer(serializers.ModelSerializer):
    processId = serializers.UUIDField(source="process_id", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = ProcessCharacterization
        fields = (
            "id",
            "processId",
            "objective",
            "scope",
            "inputs",
            "outputs",
            "responsible",
            "resources",
            "related_documents",
            "createdAt",
            "updatedAt",
        )
