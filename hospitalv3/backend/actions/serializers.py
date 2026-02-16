from rest_framework import serializers

from .models import Action


class ActionSerializer(serializers.ModelSerializer):
    processId = serializers.UUIDField(source="process_id", read_only=True)
    riskId = serializers.UUIDField(source="risk_id", read_only=True)
    assignedTo = serializers.UUIDField(source="assigned_to_id", read_only=True)
    dueDate = serializers.DateField(source="due_date", required=False, allow_null=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    closedAt = serializers.DateTimeField(source="closed_at", read_only=True)

    class Meta:
        model = Action
        fields = (
            "id",
            "title",
            "description",
            "processId",
            "riskId",
            "assignedTo",
            "dueDate",
            "status",
            "priority",
            "progress",
            "createdAt",
            "updatedAt",
            "closedAt",
        )
