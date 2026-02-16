from rest_framework import serializers

from .models import ClientLog


class ClientLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientLog
        fields = "__all__"
