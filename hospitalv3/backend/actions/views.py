from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsContributorOrReadOnly
from .models import Action
from .serializers import ActionSerializer


class ActionViewSet(viewsets.ModelViewSet):
    queryset = Action.objects.select_related("process", "risk", "assigned_to").all().order_by("-created_at")
    serializer_class = ActionSerializer
    permission_classes = [IsContributorOrReadOnly]
    filterset_fields = ("status", "priority", "process", "risk", "assigned_to")
    search_fields = ("title", "description")

    def perform_create(self, serializer):
        payload = self.request.data
        serializer.save(
            process_id=payload.get("processId"),
            risk_id=payload.get("riskId"),
            assigned_to_id=payload.get("assignedTo") or self.request.user.id,
            due_date=payload.get("dueDate"),
        )

    def perform_update(self, serializer):
        payload = self.request.data
        kwargs = {}
        if "processId" in payload:
            kwargs["process_id"] = payload.get("processId")
        if "riskId" in payload:
            kwargs["risk_id"] = payload.get("riskId")
        if "assignedTo" in payload:
            kwargs["assigned_to_id"] = payload.get("assignedTo")
        if "dueDate" in payload:
            kwargs["due_date"] = payload.get("dueDate")
        serializer.save(**kwargs)

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        action_item = self.get_object()
        action_item.status = "closed"
        action_item.progress = 100
        action_item.closed_at = timezone.now()
        action_item.save(update_fields=["status", "progress", "closed_at", "updated_at"])
        return Response(ActionSerializer(action_item).data)

    @action(detail=False, methods=["get"])
    def statistics(self, request):
        by_status = list(Action.objects.values("status").annotate(count=Count("id")))
        by_priority = list(Action.objects.values("priority").annotate(count=Count("id")))
        overdue = Action.objects.filter(~Q(status="closed"), due_date__lt=timezone.localdate()).count()
        return Response(
            {
                "total": Action.objects.count(),
                "open": Action.objects.exclude(status="closed").count(),
                "overdue": overdue,
                "byStatus": by_status,
                "byPriority": by_priority,
            }
        )
