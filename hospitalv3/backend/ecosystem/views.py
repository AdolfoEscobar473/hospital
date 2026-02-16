from django.db.models import Count
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsContributorOrReadOnly
from .models import EcosystemRecord
from .serializers import EcosystemRecordSerializer


class EcosystemRecordViewSet(viewsets.ModelViewSet):
    queryset = EcosystemRecord.objects.select_related("process", "created_by").all().order_by("-updated_at")
    serializer_class = EcosystemRecordSerializer
    permission_classes = [IsContributorOrReadOnly]
    filterset_fields = ("process", "record_type", "status")
    search_fields = ("title",)

    def perform_create(self, serializer):
        payload = self.request.data
        serializer.save(
            process_id=payload.get("processId"),
            ref_id=payload.get("refId"),
            record_type=payload.get("recordType"),
            created_by=self.request.user,
        )

    def perform_update(self, serializer):
        payload = self.request.data
        kwargs = {}
        if "processId" in payload:
            kwargs["process_id"] = payload.get("processId")
        if "refId" in payload:
            kwargs["ref_id"] = payload.get("refId")
        if "recordType" in payload:
            kwargs["record_type"] = payload.get("recordType")
        serializer.save(**kwargs)

    @action(detail=False, methods=["get"])
    def map(self, request):
        process_id = request.query_params.get("processId")
        qs = self.get_queryset()
        if process_id:
            qs = qs.filter(process_id=process_id)
        grouped = {}
        for row in qs:
            grouped.setdefault(row.record_type, []).append(EcosystemRecordSerializer(row).data)
        return Response(grouped)

    @action(detail=False, methods=["get"])
    def statistics(self, request):
        by_type = list(EcosystemRecord.objects.values("record_type").annotate(count=Count("id")))
        return Response({"total": EcosystemRecord.objects.count(), "byType": by_type})
