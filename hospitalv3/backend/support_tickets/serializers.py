from rest_framework import serializers

from .models import SupportTicket


class SupportTicketSerializer(serializers.ModelSerializer):
    assignedTo = serializers.UUIDField(source="assigned_to_id", allow_null=True, required=False)
    createdBy = serializers.UUIDField(source="created_by_id", read_only=True, allow_null=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    attachment = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = SupportTicket
        fields = (
            "id",
            "name",
            "email",
            "module",
            "priority",
            "subject",
            "message",
            "status",
            "response",
            "assignedTo",
            "createdBy",
            "attachment",
            "createdAt",
            "updatedAt",
        )
