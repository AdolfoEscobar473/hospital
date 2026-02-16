from django.db.models import Count
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsContributorOrReadOnly
from .models import AdverseEvent
from .serializers import AdverseEventSerializer


class AdverseEventViewSet(viewsets.ModelViewSet):
    queryset = AdverseEvent.objects.select_related("process", "risk", "reported_by").all().order_by("-created_at")
    serializer_class = AdverseEventSerializer
    permission_classes = [IsContributorOrReadOnly]
    filterset_fields = ("process", "risk", "status")
    search_fields = ("title", "description")

    def perform_create(self, serializer):
        payload = self.request.data
        serializer.save(
            process_id=payload.get("processId"),
            risk_id=payload.get("riskId"),
            reported_by=self.request.user,
            occurred_at=payload.get("occurredAt"),
        )

    def perform_update(self, serializer):
        payload = self.request.data
        kwargs = {}
        if "processId" in payload:
            kwargs["process_id"] = payload.get("processId")
        if "riskId" in payload:
            kwargs["risk_id"] = payload.get("riskId")
        if "occurredAt" in payload:
            kwargs["occurred_at"] = payload.get("occurredAt")
        if "actionsTaken" in payload:
            kwargs["actions_taken"] = payload.get("actionsTaken")
        serializer.save(**kwargs)

    @action(detail=False, methods=["get"])
    def statistics(self, request):
        by_status = list(AdverseEvent.objects.values("status").annotate(count=Count("id")))
        by_process = list(AdverseEvent.objects.values("process__name").annotate(count=Count("id")).order_by("-count"))
        return Response({"total": AdverseEvent.objects.count(), "byStatus": by_status, "byProcess": by_process})
