from rest_framework import permissions, viewsets

from .models import ClientLog
from .serializers import ClientLogSerializer


class ClientLogViewSet(viewsets.ModelViewSet):
    queryset = ClientLog.objects.all().order_by("-created_at")
    serializer_class = ClientLogSerializer

    def get_permissions(self):
        if self.action == "create":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]
