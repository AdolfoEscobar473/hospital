import secrets
from datetime import datetime

from django.contrib.auth import authenticate, get_user_model
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import RefreshTokenRecord, UserRole
from .permissions import IsAdminOnly, IsAdminOrLeader
from .serializers import (
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    LoginSerializer,
    RefreshSerializer,
    UserCreateUpdateSerializer,
    UserSerializer,
)

User = get_user_model()


class HealthView(APIView):
    """Health check para balanceadores y contenedores. No requiere autenticación."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"status": "ok"}, status=status.HTTP_200_OK)


def _serialize_auth_payload(user, refresh):
    roles = list(user.roles_rel.values_list("role", flat=True))
    return {
        "accessToken": str(refresh.access_token),
        "refreshToken": str(refresh),
        "mustChangePassword": user.must_change_password,
        "user": {
            "id": str(user.id),
            "username": user.username,
            "name": user.name,
            "email": user.email,
            "roles": roles,
        },
    }


@method_decorator(csrf_exempt, name="dispatch")
class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            request,
            username=serializer.validated_data["username"],
            password=serializer.validated_data["password"],
        )
        if not user:
            return Response({"error": "Credenciales invalidas"}, status=status.HTTP_401_UNAUTHORIZED)
        if not user.is_active:
            return Response({"error": "Usuario inactivo"}, status=status.HTTP_403_FORBIDDEN)
        refresh = RefreshToken.for_user(user)
        RefreshTokenRecord.objects.create(
            user=user,
            token=str(refresh),
            expires_at=datetime.fromtimestamp(refresh["exp"], tz=timezone.get_current_timezone()),
        )
        return Response(_serialize_auth_payload(user, refresh))


class RefreshView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token_str = serializer.validated_data["refreshToken"]
        try:
            refresh = RefreshToken(token_str)
            user_id = refresh["user_id"]
            user = User.objects.get(id=user_id)
            new_refresh = RefreshToken.for_user(user)
            RefreshTokenRecord.objects.filter(token=token_str).delete()
            RefreshTokenRecord.objects.create(
                user=user,
                token=str(new_refresh),
                expires_at=datetime.fromtimestamp(new_refresh["exp"], tz=timezone.get_current_timezone()),
            )
            return Response(_serialize_auth_payload(user, new_refresh))
        except Exception:
            return Response({"error": "Refresh token invalido"}, status=status.HTTP_401_UNAUTHORIZED)


class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class LogoutView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        refresh_token = request.data.get("refreshToken")
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass
            RefreshTokenRecord.objects.filter(token=refresh_token).delete()
        return Response({"success": True})


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        current_password = serializer.validated_data["currentPassword"]
        new_password = serializer.validated_data["newPassword"]
        if not user.check_password(current_password):
            return Response({"error": "Contrasena actual incorrecta"}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.must_change_password = False
        user.save(update_fields=["password", "must_change_password"])
        return Response({"success": True})


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        identifier = serializer.validated_data["identifier"]
        user = User.objects.filter(username=identifier).first() or User.objects.filter(email=identifier).first()
        if not user:
            return Response({"success": True, "message": "Si el usuario existe, sera notificado."})
        temp_password = secrets.token_urlsafe(8)
        user.set_password(temp_password)
        user.must_change_password = True
        user.save(update_fields=["password", "must_change_password"])
        return Response({"success": True, "tempPassword": temp_password})


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("-created_at")
    serializer_class = UserCreateUpdateSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            permission_classes = [IsAdminOrLeader]
        elif self.action in ("create", "destroy", "reset", "reset_password", "status"):
            permission_classes = [IsAdminOnly]
        else:
            permission_classes = [IsAdminOrLeader]
        return [p() for p in permission_classes]

    def list(self, request, *args, **kwargs):
        users = self.get_queryset()
        data = UserSerializer(users, many=True).data
        return Response(data)

    def retrieve(self, request, *args, **kwargs):
        user = self.get_object()
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=["patch"], url_path="status")
    def status(self, request, pk=None):
        user = self.get_object()
        is_active = bool(request.data.get("is_active", True))
        user.is_active = is_active
        user.save(update_fields=["is_active"])
        return Response({"success": True, "is_active": user.is_active})

    @action(detail=True, methods=["post"], url_path="reset")
    def reset(self, request, pk=None):
        """Genera contraseña temporal (solo admin)."""
        user = self.get_object()
        temp_password = secrets.token_urlsafe(8)
        user.set_password(temp_password)
        user.must_change_password = True
        user.save(update_fields=["password", "must_change_password"])
        return Response({"success": True, "tempPassword": temp_password})

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        """Establece la nueva contraseña del usuario (solo admin)."""
        user = self.get_object()
        new_password = (request.data.get("password") or "").strip()
        if not new_password:
            return Response(
                {"error": "Debes indicar la nueva contrasena."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(new_password) < 6:
            return Response(
                {"error": "La contrasena debe tener al menos 6 caracteres."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(new_password)
        user.must_change_password = True
        user.save(update_fields=["password", "must_change_password"])
        return Response({"success": True})
