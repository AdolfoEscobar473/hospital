from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ChangePasswordView,
    ForgotPasswordView,
    HealthView,
    LoginView,
    LogoutView,
    ProfileView,
    RefreshView,
    UserViewSet,
)

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="users")

urlpatterns = [
    path("health", HealthView.as_view(), name="health"),
    path("auth/login", LoginView.as_view(), name="auth-login"),
    path("auth/refresh", RefreshView.as_view(), name="auth-refresh"),
    path("auth/profile", ProfileView.as_view(), name="auth-profile"),
    path("auth/logout", LogoutView.as_view(), name="auth-logout"),
    path("auth/change-password", ChangePasswordView.as_view(), name="auth-change-password"),
    path("auth/forgot", ForgotPasswordView.as_view(), name="auth-forgot"),
    path("", include(router.urls)),
]
