from django.db.models import Count
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsContributorOrReadOnly
from .models import Risk
from .serializers import RiskSerializer


class RiskViewSet(viewsets.ModelViewSet):
    queryset = Risk.objects.all().order_by("-created_at")
    serializer_class = RiskSerializer
    permission_classes = [IsContributorOrReadOnly]
    filterset_fields = ("status", "severity", "probability", "process")
    search_fields = ("title", "description", "owner")

    @staticmethod
    def _map_level(value):
        mapping = {"low": 1, "medium": 2, "high": 3, "critical": 4, "critico": 4}
        if isinstance(value, int):
            return max(1, min(5, value))
        return mapping.get(str(value).lower(), 2)

    @action(detail=False, methods=["get"], url_path="matrix-5x5")
    def matrix_5x5(self, request):
        process_id = request.query_params.get("processId")
        queryset = self.get_queryset().filter(status="open")
        if process_id:
            queryset = queryset.filter(process_id=process_id)
        risks = list(queryset)
        grid = [[[] for _ in range(5)] for _ in range(5)]
        for r in risks:
            p = max(1, min(5, self._map_level(r.probability)))
            s = max(1, min(5, self._map_level(r.severity)))
            grid[p - 1][s - 1].append(RiskSerializer(r).data)
        top = sorted(risks, key=lambda x: self._map_level(x.probability) * self._map_level(x.severity), reverse=True)[:10]
        return Response({"grid": grid, "topRisks": RiskSerializer(top, many=True).data, "total": len(risks)})

    @action(detail=False, methods=["get"])
    def matrix(self, request):
        open_risks = self.get_queryset().filter(status="open")
        groups = {"critical": [], "high": [], "medium": [], "low": []}
        for r in open_risks:
            score = self._map_level(r.probability) * self._map_level(r.severity)
            key = "critical" if score >= 9 else ("high" if score >= 6 else ("medium" if score >= 3 else "low"))
            groups[key].append(RiskSerializer(r).data)
        return Response(groups)

    @action(detail=False, methods=["get"])
    def statistics(self, request):
        by_severity = list(Risk.objects.filter(status="open").values("severity").annotate(count=Count("id")))
        by_status = list(Risk.objects.values("status").annotate(count=Count("id")))
        return Response(
            {
                "total": Risk.objects.count(),
                "open": Risk.objects.filter(status="open").count(),
                "bySeverity": by_severity,
                "byStatus": by_status,
            }
        )
