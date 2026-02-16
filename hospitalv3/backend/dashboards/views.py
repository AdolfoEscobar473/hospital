from datetime import timedelta

from django.db.models import Count
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from actions.models import Action
from adverse_events.models import AdverseEvent
from committees.models import Commitment
from documents.models import Document
from indicators.models import Indicator
from processes.models import Process
from risks.models import Risk
from support_tickets.models import SupportTicket


class DashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        doc_total = Document.objects.count()
        since = timezone.now() - timedelta(days=30)
        doc_recent = Document.objects.filter(created_at__gte=since).count()
        doc_by_type = list(
            Document.objects.values("type__name")
            .annotate(count=Count("id"))
            .order_by("-count")
        )
        doc_by_status = list(
            Document.objects.values("status")
            .annotate(count=Count("id"))
            .order_by("-count")
        )
        return Response(
            {
                "users": {"total": request.user.__class__.objects.count()},
                "processes": {"total": Process.objects.count()},
                "documents": {
                    "total": doc_total,
                    "uploadedLast30Days": doc_recent,
                    "byType": doc_by_type,
                    "byStatus": doc_by_status,
                },
                "risks": {
                    "total": Risk.objects.count(),
                    "open": Risk.objects.filter(status="open").count(),
                },
                "actions": {
                    "total": Action.objects.count(),
                    "open": Action.objects.exclude(status="closed").count(),
                },
                "indicators": {"total": Indicator.objects.count()},
                "adverseEvents": {"total": AdverseEvent.objects.count()},
                "supportTickets": {
                    "total": SupportTicket.objects.count(),
                    "open": SupportTicket.objects.exclude(status="closed").count(),
                },
                "commitments": {
                    "total": Commitment.objects.count(),
                    "pending": Commitment.objects.exclude(status="completed").count(),
                },
            }
        )


class DashboardChartsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            {
                "risksByStatus": list(Risk.objects.values("status").annotate(count=Count("id"))),
                "actionsByStatus": list(Action.objects.values("status").annotate(count=Count("id"))),
                "ticketsByPriority": list(SupportTicket.objects.values("priority").annotate(count=Count("id"))),
                "documentsByProcess": list(
                    Document.objects.values("process__name").annotate(count=Count("id")).order_by("-count")[:10]
                ),
            }
        )
