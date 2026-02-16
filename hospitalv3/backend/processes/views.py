from collections import defaultdict

from django.db.models import Count
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsContributorOrReadOnly
from actions.models import Action
from adverse_events.models import AdverseEvent
from committees.models import Committee
from documents.models import Document
from indicators.models import Indicator
from risks.models import Risk

from .models import Process, ProcessCharacterization
from .serializers import ProcessCharacterizationSerializer, ProcessSerializer


class ProcessViewSet(viewsets.ModelViewSet):
    queryset = Process.objects.all().order_by("-created_at")
    serializer_class = ProcessSerializer
    permission_classes = [IsContributorOrReadOnly]
    filterset_fields = ("category", "status")
    search_fields = ("name", "description", "code")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, owner=self.request.user)

    @action(detail=False, methods=["get"])
    def grouped(self, request):
        grouped = defaultdict(list)
        for proc in self.get_queryset():
            grouped[proc.category].append(ProcessSerializer(proc).data)
        return Response(grouped)

    @action(detail=False, methods=["get"])
    def statistics(self, request):
        rows = (
            Process.objects.values("category")
            .order_by("category")
            .annotate(total_count_count=Count("id"))
        )
        return Response(
            {
                "total": Process.objects.count(),
                "byCategory": list(rows),
            }
        )

    @action(detail=True, methods=["get"])
    def summary(self, request, pk=None):
        process = self.get_object()
        return Response(
            {
                **ProcessSerializer(process).data,
                "counts": {
                    "documents": Document.objects.filter(process=process).count(),
                    "indicators": Indicator.objects.filter(process=process).count(),
                    "risks": Risk.objects.filter(process=process).count(),
                    "actions": Action.objects.filter(process=process).count(),
                    "adverseEvents": AdverseEvent.objects.filter(process=process).count(),
                    "committees": Committee.objects.filter(process=process).count(),
                },
            }
        )

    @action(detail=True, methods=["get"])
    def health(self, request, pk=None):
        process = self.get_object()
        docs = Document.objects.filter(process=process)
        indicators = Indicator.objects.filter(process=process)
        risks = Risk.objects.filter(process=process)
        actions = Action.objects.filter(process=process)
        events = AdverseEvent.objects.filter(process=process)
        total = docs.count() + indicators.count() + risks.count() + actions.count() + events.count()
        score = 100 if total == 0 else max(0, 100 - (risks.filter(status="open").count() * 5) - (events.filter(status="open").count() * 8))
        nivel = "saludable" if score >= 75 else ("atencion" if score >= 50 else "critico")
        return Response(
            {
                "score": score,
                "nivel": nivel,
                "metrics": {
                    "documentos": docs.count(),
                    "documentosVigentes": docs.filter(status__iexact="vigente").count(),
                    "indicadores": indicators.count(),
                    "riesgos": risks.count(),
                    "accionesAbiertas": actions.exclude(status="closed").count(),
                    "eventosAbiertos": events.exclude(status="closed").count(),
                },
            }
        )

    @action(detail=True, methods=["get"], url_path="export/pdf")
    def export_pdf(self, request, pk=None):
        process = self.get_object()
        payload = {"message": "Export endpoint ready", "process": ProcessSerializer(process).data, "format": "pdf"}
        return Response(payload, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="export/excel")
    def export_excel(self, request, pk=None):
        process = self.get_object()
        payload = {"message": "Export endpoint ready", "process": ProcessSerializer(process).data, "format": "excel"}
        return Response(payload, status=status.HTTP_200_OK)


class ProcessCharacterizationViewSet(viewsets.ViewSet):
    permission_classes = [IsContributorOrReadOnly]

    def retrieve(self, request, pk=None):
        item = ProcessCharacterization.objects.filter(process_id=pk).first()
        if not item:
            return Response({"error": "Caracterizacion no encontrada"}, status=status.HTTP_404_NOT_FOUND)
        return Response(ProcessCharacterizationSerializer(item).data)

    def create(self, request, pk=None):
        process = Process.objects.filter(id=pk).first()
        if not process:
            return Response({"error": "Proceso no encontrado"}, status=status.HTTP_404_NOT_FOUND)
        item, _created = ProcessCharacterization.objects.get_or_create(process=process)
        serializer = ProcessCharacterizationSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        item = ProcessCharacterization.objects.filter(process_id=pk).first()
        if not item:
            return Response({"error": "Caracterizacion no encontrada"}, status=status.HTTP_404_NOT_FOUND)
        serializer = ProcessCharacterizationSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
