from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from actions.models import Action
from documents.models import Document
from indicators.models import Indicator
from processes.models import Process
from risks.models import Risk


class GlobalSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        if not q:
            return Response({"query": q, "results": []})
        processes = Process.objects.filter(name__icontains=q)[:10]
        documents = Document.objects.filter(originalname__icontains=q)[:10]
        risks = Risk.objects.filter(title__icontains=q)[:10]
        actions = Action.objects.filter(title__icontains=q)[:10]
        indicators = Indicator.objects.filter(name__icontains=q)[:10]
        results = []
        for row in processes:
            results.append({"type": "process", "id": str(row.id), "title": row.name})
        for row in documents:
            results.append({"type": "document", "id": str(row.id), "title": row.originalname})
        for row in risks:
            results.append({"type": "risk", "id": str(row.id), "title": row.title})
        for row in actions:
            results.append({"type": "action", "id": str(row.id), "title": row.title})
        for row in indicators:
            results.append({"type": "indicator", "id": str(row.id), "title": row.name})
        return Response({"query": q, "count": len(results), "results": results})
