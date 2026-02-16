from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("accounts.urls")),
    path("api/", include("processes.urls")),
    path("api/", include("documents.urls")),
    path("api/", include("risks.urls")),
    path("api/", include("actions.urls")),
    path("api/", include("committees.urls")),
    path("api/", include("indicators.urls")),
    path("api/", include("adverse_events.urls")),
    path("api/", include("support_tickets.urls")),
    path("api/", include("dashboards.urls")),
    path("api/", include("searchapp.urls")),
    path("api/", include("ecosystem.urls")),
    path("api/", include("mywork.urls")),
    path("api/", include("system_config.urls")),
    path("api/", include("logsapp.urls")),
    path("api/schema", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
