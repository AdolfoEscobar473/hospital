from django.db.models import Count
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsContributorOrReadOnly
from .models import Indicator
from .serializers import IndicatorSerializer


class IndicatorViewSet(viewsets.ModelViewSet):
    queryset = Indicator.objects.select_related("process").all().order_by("-created_at")
    serializer_class = IndicatorSerializer
    permission_classes = [IsContributorOrReadOnly]
    filterset_fields = ("process", "frequency")
    search_fields = ("name", "description")

    def perform_create(self, serializer):
        payload = self.request.data
        serializer.save(process_id=payload.get("processId"))

    def perform_update(self, serializer):
        payload = self.request.data
        kwargs = {}
        if "processId" in payload:
            kwargs["process_id"] = payload.get("processId")
        serializer.save(**kwargs)

    @action(detail=False, methods=["get"])
    def statistics(self, request):
        by_process = list(Indicator.objects.values("process__name").annotate(count=Count("id")).order_by("-count"))
        return Response({"total": Indicator.objects.count(), "byProcess": by_process})
