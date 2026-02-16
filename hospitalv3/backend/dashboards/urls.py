from django.urls import path

from .views import DashboardChartsView, DashboardSummaryView

urlpatterns = [
    path("dashboard/summary", DashboardSummaryView.as_view(), name="dashboard-summary"),
    path("dashboard/charts", DashboardChartsView.as_view(), name="dashboard-charts"),
]
