from django.urls import path

from .views import MyWorkView

urlpatterns = [
    path("my-work", MyWorkView.as_view(), name="my-work"),
]
