import uuid
from django.db import models

from processes.models import Process


class Indicator(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    process = models.ForeignKey(Process, on_delete=models.SET_NULL, blank=True, null=True, related_name="indicators")
    target = models.FloatField(blank=True, null=True)
    current = models.FloatField(blank=True, null=True)
    unit = models.CharField(max_length=80, blank=True, null=True)
    frequency = models.CharField(max_length=80, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "indicators"


class IndicatorHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    indicator = models.ForeignKey(Indicator, on_delete=models.CASCADE, related_name="history")
    value = models.FloatField()
    recorded_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "indicator_history"
