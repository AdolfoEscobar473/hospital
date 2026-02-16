from rest_framework import serializers

from .models import Indicator, IndicatorHistory


class IndicatorSerializer(serializers.ModelSerializer):
    processId = serializers.UUIDField(source="process_id", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = Indicator
        fields = (
            "id",
            "name",
            "description",
            "processId",
            "target",
            "current",
            "unit",
            "frequency",
            "createdAt",
            "updatedAt",
        )


class IndicatorHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = IndicatorHistory
        fields = "__all__"
