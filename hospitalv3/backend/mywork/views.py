from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from actions.models import Action
from actions.serializers import ActionSerializer
from committees.models import Commitment
from committees.serializers import CommitmentSerializer
from support_tickets.models import SupportTicket
from support_tickets.serializers import SupportTicketSerializer


class MyWorkView(APIView):
    """
    Vista personalizada por usuario: solo devuelve acciones, compromisos y tickets
    asignados al usuario que ha iniciado sesión.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        user = request.user
        actions_qs = Action.objects.filter(assigned_to=user).order_by("due_date")
        commitments_qs = Commitment.objects.filter(assigned_to=user).select_related("committee").order_by("due_date")
        tickets_qs = SupportTicket.objects.filter(assigned_to=user).order_by("-created_at")

        actions_list = list(actions_qs)
        commitments_list = list(commitments_qs)
        tickets_list = list(tickets_qs)

        actions_data = ActionSerializer(actions_list, many=True).data
        commitments_data = [
            {**CommitmentSerializer(c).data, "committeeName": c.committee.name if c.committee else None}
            for c in commitments_list
        ]
        tickets_data = SupportTicketSerializer(tickets_list, many=True).data

        return Response(
            {
                "actions": {
                    "pending": actions_qs.exclude(status="closed").count(),
                    "overdue": actions_qs.exclude(status="closed").filter(due_date__lt=today).count(),
                    "items": actions_data,
                },
                "commitments": {
                    "pending": commitments_qs.exclude(status="completed").count(),
                    "overdue": commitments_qs.exclude(status="completed").filter(due_date__lt=today).count(),
                    "items": commitments_data,
                },
                "supportTickets": {
                    "open": tickets_qs.exclude(status="closed").count(),
                    "items": tickets_data,
                },
            }
        )
