from datetime import timedelta

from django.db.models import Count
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsContributorOrReadOnly
from .models import Committee, CommitteeMember, CommitteeSession, Commitment
from .serializers import (
    CommitteeMemberSerializer,
    CommitteeSerializer,
    CommitteeSessionSerializer,
    CommitmentSerializer,
)


class CommitteeViewSet(viewsets.ModelViewSet):
    queryset = Committee.objects.select_related("process", "owner_user").all().order_by("-created_at")
    serializer_class = CommitteeSerializer
    permission_classes = [IsContributorOrReadOnly]
    filterset_fields = ("process", "owner_user")
    search_fields = ("name", "description")

    def perform_create(self, serializer):
        payload = self.request.data
        serializer.save(
            process_id=payload.get("processId"),
            owner_user=self.request.user,
        )

    def perform_update(self, serializer):
        payload = self.request.data
        kwargs = {}
        if "processId" in payload:
            kwargs["process_id"] = payload.get("processId")
        serializer.save(**kwargs)

    @action(detail=True, methods=["get"])
    def sessions(self, request, pk=None):
        data = CommitteeSessionSerializer(CommitteeSession.objects.filter(committee_id=pk).order_by("-session_date"), many=True).data
        return Response(data)

    @sessions.mapping.post
    def create_session(self, request, pk=None):
        payload = request.data.copy()
        payload["committee_id"] = pk
        serializer = CommitteeSessionSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        serializer.save(committee_id=pk)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def commitments(self, request, pk=None):
        queryset = Commitment.objects.filter(committee_id=pk).order_by("-created_at")
        status_filter = request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return Response(CommitmentSerializer(queryset, many=True).data)

    @commitments.mapping.post
    def create_commitment(self, request, pk=None):
        payload = request.data.copy()
        payload["committee_id"] = pk
        serializer = CommitmentSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        serializer.save(committee_id=pk)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def members(self, request, pk=None):
        members = CommitteeMember.objects.filter(committee_id=pk).order_by("joined_at")
        return Response(CommitteeMemberSerializer(members, many=True).data)

    @members.mapping.post
    def add_member(self, request, pk=None):
        payload = request.data.copy()
        payload["committee_id"] = pk
        serializer = CommitteeMemberSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        serializer.save(committee_id=pk)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def timeline(self, request, pk=None):
        commits = Commitment.objects.filter(committee_id=pk).order_by("due_date")
        sessions = CommitteeSession.objects.filter(committee_id=pk).order_by("session_date")
        return Response(
            {
                "sessions": CommitteeSessionSerializer(sessions, many=True).data,
                "commitments": CommitmentSerializer(commits, many=True).data,
            }
        )


class CommitteeSessionViewSet(viewsets.ModelViewSet):
    queryset = CommitteeSession.objects.select_related("committee").all().order_by("-session_date")
    serializer_class = CommitteeSessionSerializer
    filterset_fields = ("committee",)


class CommitmentViewSet(viewsets.ModelViewSet):
    queryset = Commitment.objects.select_related("committee", "assigned_to", "closed_by").all().order_by("-created_at")
    serializer_class = CommitmentSerializer
    filterset_fields = ("committee", "assigned_to", "status")
    search_fields = ("description", "evidence")

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        commitment = self.get_object()
        commitment.status = "completed"
        commitment.closed_at = timezone.now()
        commitment.closed_by = request.user
        commitment.save(update_fields=["status", "closed_at", "closed_by", "updated_at"])
        return Response(CommitmentSerializer(commitment).data)

    @action(detail=False, methods=["get"])
    def overdue(self, request):
        today = timezone.localdate()
        data = Commitment.objects.exclude(status="completed").filter(due_date__lt=today)
        return Response(CommitmentSerializer(data, many=True).data)

    @action(detail=False, methods=["get"])
    def reminders(self, request):
        days = int(request.query_params.get("days", "3"))
        today = timezone.localdate()
        limit = today + timedelta(days=days)
        queryset = Commitment.objects.exclude(status="completed").filter(due_date__gte=today, due_date__lte=limit).select_related("assigned_to")
        reminders = []
        for row in queryset:
            reminders.append(
                {
                    "commitmentId": str(row.id),
                    "description": row.description,
                    "dueDate": row.due_date,
                    "assignedTo": str(row.assigned_to_id) if row.assigned_to_id else None,
                    "assignedEmail": row.assigned_to.email if row.assigned_to else None,
                }
            )
        return Response({"count": len(reminders), "items": reminders})

    @action(detail=False, methods=["get"])
    def statistics(self, request):
        by_status = list(Commitment.objects.values("status").annotate(count=Count("id")))
        by_assignee = list(
            Commitment.objects.values("assigned_to__name")
            .annotate(count=Count("id"))
            .order_by("-count")[:20]
        )
        return Response({"total": Commitment.objects.count(), "byStatus": by_status, "byAssignee": by_assignee})
