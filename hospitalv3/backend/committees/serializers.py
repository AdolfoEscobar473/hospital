from rest_framework import serializers

from .models import Committee, CommitteeMember, CommitteeSession, Commitment


class CommitteeSerializer(serializers.ModelSerializer):
    processId = serializers.UUIDField(source="process_id", read_only=True)
    ownerUserId = serializers.UUIDField(source="owner_user_id", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = Committee
        fields = ("id", "name", "description", "processId", "ownerUserId", "createdAt", "updatedAt")


class CommitteeMemberSerializer(serializers.ModelSerializer):
    committeeId = serializers.UUIDField(source="committee_id", read_only=True)
    userId = serializers.UUIDField(source="user_id")
    joinedAt = serializers.DateTimeField(source="joined_at", read_only=True)

    class Meta:
        model = CommitteeMember
        fields = ("id", "committeeId", "userId", "role", "joinedAt")


class CommitteeSessionSerializer(serializers.ModelSerializer):
    committeeId = serializers.UUIDField(source="committee_id")
    sessionDate = serializers.DateField(source="session_date")
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = CommitteeSession
        fields = ("id", "committeeId", "sessionDate", "notes", "createdAt")


class CommitmentSerializer(serializers.ModelSerializer):
    committeeId = serializers.UUIDField(source="committee_id")
    assignedTo = serializers.UUIDField(source="assigned_to_id", allow_null=True, required=False)
    dueDate = serializers.DateField(source="due_date", allow_null=True, required=False)
    closedAt = serializers.DateTimeField(source="closed_at", read_only=True)
    closedBy = serializers.UUIDField(source="closed_by_id", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = Commitment
        fields = (
            "id",
            "committeeId",
            "description",
            "assignedTo",
            "dueDate",
            "status",
            "evidence",
            "closedAt",
            "closedBy",
            "createdAt",
            "updatedAt",
        )
