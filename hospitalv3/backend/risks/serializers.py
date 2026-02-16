from rest_framework import serializers

from .models import Risk, RiskMatrixHistory


class RiskSerializer(serializers.ModelSerializer):
    processId = serializers.UUIDField(source="process_id", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = Risk
        fields = (
            "id",
            "title",
            "description",
            "processId",
            "severity",
            "probability",
            "mitigation",
            "owner",
            "status",
            "createdAt",
            "updatedAt",
        )


class RiskMatrixHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = RiskMatrixHistory
        fields = "__all__"
