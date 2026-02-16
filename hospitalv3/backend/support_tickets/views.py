from django.db.models import Count
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

from accounts.permissions import IsContributorOrReadOnly
from system_config.email_service import send_email

from .models import SupportTicket
from .serializers import SupportTicketSerializer


def _user_is_admin(request):
    if not getattr(request, "user", None) or not getattr(request.user, "is_authenticated", False):
        return False
    return request.user.roles_rel.filter(role="admin").exists()


class SupportTicketViewSet(viewsets.ModelViewSet):
    serializer_class = SupportTicketSerializer
    filterset_fields = ("status", "priority", "module", "assigned_to")
    search_fields = ("name", "email", "subject", "message")

    def get_queryset(self):
        qs = SupportTicket.objects.select_related("assigned_to", "created_by").all().order_by("-created_at")
        if self.request and getattr(self.request, "user", None) and getattr(self.request.user, "is_authenticated", False):
            if _user_is_admin(self.request):
                return qs
            return qs.filter(created_by=self.request.user)
        return qs.none()

    def get_permissions(self):
        if self.action == "create":
            return [permissions.AllowAny()]
        return [IsContributorOrReadOnly()]

    def _do_perform_update(self, serializer):
        """Lógica de guardado y envío de correo al resolver (llamada desde update tras validar)."""
        instance = serializer.instance
        old_status = instance.status
        ticket = serializer.save()
        to_email = getattr(ticket, "email", None)
        if not to_email:
            return
        if old_status != "closed" and getattr(ticket, "status", None) == "closed":
            subject = "Soporte SGI – Tu solicitud ha sido resuelta"
            response_text = getattr(ticket, "response", None) or "Tu solicitud ha sido cerrada por el equipo de soporte."
            body_plain = (
                f"Hola {getattr(ticket, 'name', '')},\n\n"
                "Tu solicitud de soporte ha sido resuelta.\n\n"
                f"Referencia: {ticket.id}\n"
                f"Asunto: {getattr(ticket, 'subject', '')}\n\n"
                f"Respuesta del equipo:\n{response_text}\n\n"
                "— Equipo SGI Hospital"
            )
            try:
                send_email(
                    to_email=to_email,
                    subject=subject,
                    body_plain=body_plain,
                    event_type="support_ticket_resolved",
                    user=getattr(self.request, "user", None),
                    attachments=None,
                )
            except Exception:
                pass

    def update(self, request, *args, **kwargs):
        partial = kwargs.get("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data.get("status")
        if new_status == "closed" and not _user_is_admin(request):
            raise PermissionDenied("Solo el administrador puede marcar un ticket como resuelto.")
        self._do_perform_update(serializer)
        return Response(serializer.data)

    def perform_create(self, serializer):
        user = getattr(self.request, "user", None) if getattr(getattr(self.request, "user", None), "is_authenticated", False) else None
        ticket = serializer.save(created_by=user)
        to_email = getattr(ticket, "email", None)
        if not to_email:
            return
        if user:
            session_info = f"Usuario/Sesión: {getattr(user, 'username', '')} ({getattr(user, 'email', '') or '—'})"
        else:
            session_info = f"Solicitante: Anónimo – {getattr(ticket, 'name', '')} ({getattr(ticket, 'email', '')})"
        subject = "Soporte SGI – Hemos recibido tu solicitud"
        body_plain = (
            f"Hola {getattr(ticket, 'name', '')},\n\n"
            f"Hemos recibido tu solicitud de soporte.\n\n"
            f"{session_info}\n\n"
            f"Referencia: {ticket.id}\n"
            f"Asunto: {getattr(ticket, 'subject', '')}\n"
            f"Módulo: {getattr(ticket, 'module', '') or '—'}\n"
            f"Prioridad: {getattr(ticket, 'priority', 'medium')}\n\n"
            "Te contactaremos a la brevedad.\n\n"
            "— Equipo SGI Hospital"
        )
        attachments = []
        if getattr(ticket, "attachment", None) and ticket.attachment:
            try:
                with ticket.attachment.open("rb") as f:
                    content = f.read()
                import mimetypes
                name = ticket.attachment.name
                if "/" in name:
                    name = name.split("/")[-1]
                content_type = mimetypes.guess_type(name)[0] or "application/octet-stream"
                attachments.append({"filename": name, "content": content, "content_type": content_type})
            except Exception:
                pass
        try:
            send_email(
                to_email=to_email,
                subject=subject,
                body_plain=body_plain,
                event_type="support_ticket",
                user=user,
                attachments=attachments if attachments else None,
            )
        except Exception:
            pass

    @action(detail=False, methods=["get"])
    def statistics(self, request):
        qs = self.get_queryset()
        by_status = list(qs.values("status").annotate(count=Count("id")))
        by_priority = list(qs.values("priority").annotate(count=Count("id")))
        return Response({"total": qs.count(), "byStatus": by_status, "byPriority": by_priority})
