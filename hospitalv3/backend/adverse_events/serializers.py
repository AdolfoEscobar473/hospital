from rest_framework import serializers

from .models import AdverseEvent


class AdverseEventSerializer(serializers.ModelSerializer):
    processId = serializers.UUIDField(source="process_id", read_only=True)
    riskId = serializers.UUIDField(source="risk_id", read_only=True)
    reportedBy = serializers.UUIDField(source="reported_by_id", read_only=True)
    occurredAt = serializers.DateTimeField(source="occurred_at", allow_null=True, required=False)
    actionsTaken = serializers.CharField(source="actions_taken", allow_blank=True, required=False)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = AdverseEvent
        fields = (
            "id",
            "processId",
            "riskId",
            "title",
            "description",
            "severity",
            "probability",
            "occurredAt",
            "reportedBy",
            "status",
            "analysis",
            "actionsTaken",
            "createdAt",
            "updatedAt",
        )
