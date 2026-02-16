from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    AuditLog,
    CatalogItem,
    ColumnSetting,
    EmailLog,
    OAuthConfig,
    RoleConfig,
    RolePermission,
    SMTPConfig,
    StorageConfig,
)
from .serializers import (
    AuditLogSerializer,
    CatalogItemSerializer,
    ColumnSettingSerializer,
    EmailLogSerializer,
    OAuthConfigSerializer,
    RoleConfigSerializer,
    RolePermissionSerializer,
    SMTPConfigSerializer,
    StorageConfigSerializer,
)


class RoleConfigViewSet(viewsets.ModelViewSet):
    queryset = RoleConfig.objects.prefetch_related("permissions").all().order_by("code")
    serializer_class = RoleConfigSerializer


class RolePermissionViewSet(viewsets.ModelViewSet):
    queryset = RolePermission.objects.select_related("role").all()
    serializer_class = RolePermissionSerializer
    filterset_fields = ("role", "module")


class PermissionsBulkView(APIView):
    """Save the entire permissions matrix in one request."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        perms = RolePermission.objects.select_related("role").all()
        return Response(RolePermissionSerializer(perms, many=True).data)

    def put(self, request):
        rows = request.data if isinstance(request.data, list) else request.data.get("permissions", [])
        saved = 0
        for row in rows:
            role_code = row.get("role")
            module = row.get("module")
            if not role_code or not module:
                continue
            RolePermission.objects.update_or_create(
                role_id=role_code, module=module,
                defaults={
                    "can_read": bool(row.get("can_read", False)),
                    "can_edit": bool(row.get("can_edit", False)),
                    "can_approve": bool(row.get("can_approve", False)),
                    "can_delete": bool(row.get("can_delete", False)),
                },
            )
            saved += 1
        return Response({"saved": saved})

    def post(self, request):
        return self.put(request)


class CatalogItemViewSet(viewsets.ModelViewSet):
    queryset = CatalogItem.objects.all().order_by("catalog_key", "value")
    serializer_class = CatalogItemSerializer
    filterset_fields = ("catalog_key",)
    search_fields = ("value",)


class ColumnSettingViewSet(viewsets.ModelViewSet):
    queryset = ColumnSetting.objects.all().order_by("module")
    serializer_class = ColumnSettingSerializer
    lookup_field = "module"


class SMTPConfigView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        item, _ = SMTPConfig.objects.get_or_create(id=1)
        return Response(SMTPConfigSerializer(item).data)

    def put(self, request):
        item, _ = SMTPConfig.objects.get_or_create(id=1)
        serializer = SMTPConfigSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def patch(self, request):
        return self.put(request)


class OAuthConfigView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        item, _ = OAuthConfig.objects.get_or_create(id=1)
        return Response(OAuthConfigSerializer(item).data)

    def put(self, request):
        item, _ = OAuthConfig.objects.get_or_create(id=1)
        serializer = OAuthConfigSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def patch(self, request):
        return self.put(request)


class StorageConfigView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        item, _ = StorageConfig.objects.get_or_create(id=1)
        return Response(StorageConfigSerializer(item).data)

    def put(self, request):
        item, _ = StorageConfig.objects.get_or_create(id=1)
        serializer = StorageConfigSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def patch(self, request):
        return self.put(request)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related("user").all().order_by("-created_at")
    serializer_class = AuditLogSerializer
    filterset_fields = ("event_type", "entity_type", "status")
    search_fields = ("entity_id",)


class EmailLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = EmailLog.objects.select_related("user").all().order_by("-created_at")
    serializer_class = EmailLogSerializer
    filterset_fields = ("event_type", "provider", "status")
    search_fields = ("to_email", "subject")


class ConfigTestView(APIView):
    """
    Endpoint para probar la configuracion de correo.
    - Si provider == m365: usa Microsoft Graph con OAuth2 de aplicacion.
    - Si provider == gmail: preparado para futuro (de momento solo valida campos).
    - En otro caso: intenta usar SMTP clasico (aun no implementado por completo).
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        import msal
        import requests

        target = request.data.get("to") or request.user.email
        if not target:
            return Response(
                {"success": False, "message": "No hay correo destino para la prueba."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        oauth, _ = OAuthConfig.objects.get_or_create(id=1)
        smtp, _ = SMTPConfig.objects.get_or_create(id=1)

        provider = (oauth.provider or "none").lower()

        if provider == "gmail":
            if not all([oauth.client_id, oauth.client_secret, oauth.gmail_user, oauth.gmail_refresh_token]):
                return Response(
                    {"success": False, "message": "Completa los campos obligatorios de OAuth2 para Gmail (Client ID, Client Secret, Cuenta Gmail, Refresh Token)."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response(
                {
                    "success": True,
                    "message": "Configuracion Gmail guardada correctamente. El envio de correo por Gmail OAuth2 aun no esta implementado.",
                },
                status=status.HTTP_200_OK,
            )

        try:
            if provider == "m365":
                self._send_test_m365(oauth, target)
            else:
                self._send_test_smtp(smtp, target)

        except ValueError as exc:
            return Response(
                {"success": False, "message": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:  # pragma: no cover - errores inesperados
            return Response(
                {"success": False, "message": f"Error al enviar correo: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {"success": True, "message": f"Correo de prueba enviado a {target}"},
            status=status.HTTP_200_OK,
        )

    def _send_test_smtp(self, cfg: SMTPConfig, target: str) -> None:
        """
        Envio simple via SMTP clasico usando la configuracion guardada.
        Dejado listo para cuando configures un servidor SMTP dedicado.
        """
        if not cfg.host or not cfg.port or not cfg.from_email:
            raise ValueError(
                "Configura host, puerto y correo remitente SMTP antes de enviar la prueba."
            )

        # Aqui se podria mapear cfg a settings.EMAIL_*, pero por ahora
        # dejamos claro que falta implementacion real:
        raise ValueError("Envio real via SMTP aun no esta implementado en este entorno.")

    def _send_test_m365(self, cfg: OAuthConfig, target: str) -> None:
        """
        Envio de correo usando Microsoft 365 (Graph API, flujo de aplicacion).
        Requiere:
          - tenant_id
          - client_id
          - client_secret
          - sender_email
          - Permiso Mail.Send (Application) con admin consent.
        """
        import msal
        import requests

        tenant = cfg.tenant_id
        client_id = cfg.client_id
        client_secret = cfg.client_secret
        sender = cfg.sender_email

        if not all([tenant, client_id, client_secret, sender]):
            raise ValueError(
                "Config OAuth2 M365 incompleta. Revisa Tenant ID, Client ID, Client Secret y Sender Email."
            )

        authority = f"https://login.microsoftonline.com/{tenant}"
        app = msal.ConfidentialClientApplication(
            client_id=client_id,
            authority=authority,
            client_credential=client_secret,
        )
        scopes = ["https://graph.microsoft.com/.default"]

        result = app.acquire_token_for_client(scopes=scopes)
        if "access_token" not in result:
            msg = result.get("error_description") or result.get("error") or "No se pudo obtener token de Azure."
            raise ValueError(f"Error al obtener token de Microsoft 365: {msg}")

        access_token = result["access_token"]

        url = f"https://graph.microsoft.com/v1.0/users/{sender}/sendMail"
        payload = {
            "message": {
                "subject": "Prueba configuración correo SGI",
                "body": {
                    "contentType": "Text",
                    "content": "Este es un correo de prueba enviado desde el SGI Hospital.",
                },
                "toRecipients": [{"emailAddress": {"address": target}}],
            },
            "saveToSentItems": False,
        }

        resp = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=15,
        )

        if resp.status_code >= 400:
            raise ValueError(f"Error de Graph ({resp.status_code}): {resp.text}")


class ConfigLookupView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = (request.query_params.get("q") or "").strip()
        rows = CatalogItem.objects.all()
        if query:
            rows = rows.filter(Q(catalog_key__icontains=query) | Q(value__icontains=query))
        return Response(CatalogItemSerializer(rows[:100], many=True).data)
