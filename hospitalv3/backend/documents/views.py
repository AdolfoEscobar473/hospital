import io
import os
import uuid
import zipfile
from django.conf import settings
from django.db.models import Count, Sum
from django.http import FileResponse, HttpResponse
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from accounts.permissions import IsContributorOrReadOnly
from processes.models import Process

from .models import Document, DocumentType
from .serializers import DocumentSerializer, DocumentTypeSerializer


class DocumentTypeViewSet(viewsets.ModelViewSet):
    queryset = DocumentType.objects.all().order_by("name")
    serializer_class = DocumentTypeSerializer
    permission_classes = [IsContributorOrReadOnly]


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.select_related("process", "uploader", "type").all().order_by("-created_at")
    serializer_class = DocumentSerializer
    permission_classes = [IsContributorOrReadOnly]
    parser_classes = [JSONParser, FormParser, MultiPartParser]
    filterset_fields = ("process", "status", "type")
    search_fields = ("originalname", "filename", "uploader_name")

    def create(self, request, *args, **kwargs):
        try:
            upload_dir = os.path.join(settings.MEDIA_ROOT, "documents")
            os.makedirs(upload_dir, exist_ok=True)
            _file_from_data = request.data.get("file")
            file_obj = request.FILES.get("file") or (_file_from_data if getattr(_file_from_data, "read", None) else None)
            data = request.data.copy() if hasattr(request.data, "copy") else {}
            if not hasattr(data, "copy"):
                for k in ("file", "type", "processId", "status", "version", "visibility", "filename", "originalname"):
                    if k in request.data:
                        data[k] = request.data.get(k)
                if file_obj and "file" not in data:
                    data["file"] = file_obj
            if file_obj:
                data["file"] = file_obj
                data["filename"] = getattr(file_obj, "name", None) or data.get("filename") or "document"
                data["originalname"] = getattr(file_obj, "name", None) or data.get("originalname") or "document"
            else:
                data["filename"] = data.get("filename") or "document"
                data["originalname"] = data.get("originalname") or "document"
            if data.get("type") == "" or data.get("type") is None:
                data["type"] = None
            if data.get("processId") == "":
                data["processId"] = None
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            import traceback
            traceback.print_exc()
            msg = str(e)
            return Response(
                {"detail": msg, "error": msg},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def perform_create(self, serializer):
        file_obj = self.request.FILES.get("file") or (self.request.data.get("file") if hasattr(self.request.data.get("file"), "read") else None)
        process_id_raw = self.request.data.get("processId") or self.request.data.get("process_id")
        process_id = None
        if process_id_raw:
            try:
                pid = uuid.UUID(str(process_id_raw))
                if Process.objects.filter(pk=pid).exists():
                    process_id = process_id_raw
            except (ValueError, TypeError, AttributeError):
                pass
        filename = (file_obj.name if file_obj else None) or self.request.data.get("filename") or ""
        originalname = (file_obj.name if file_obj else None) or self.request.data.get("originalname") or ""
        serializer.save(
            uploader=self.request.user,
            uploader_name=(self.request.user.name or self.request.user.username) or "unknown",
            filename=filename,
            originalname=originalname,
            file_size=getattr(file_obj, "size", None),
            mime_type=getattr(file_obj, "content_type", None),
            process_id=process_id,
            file=file_obj if file_obj else None,
        )

    @action(detail=False, methods=["get"])
    def statistics(self, request):
        total = Document.objects.count()
        total_size = Document.objects.aggregate(size=Sum("file_size")).get("size") or 0

        by_process = list(
            Document.objects.values("process__name").annotate(count=Count("id")).order_by("-count")
        )
        top_uploaders = list(
            Document.objects.values("uploader_name").annotate(count=Count("id")).order_by("-count")[:10]
        )
        by_status = list(
            Document.objects.values("status").annotate(count=Count("id")).order_by("status")
        )

        return Response(
            {
                "total": total,
                "totalSize": total_size,
                "byProcess": by_process,
                "topUploaders": top_uploaders,
                "byStatus": by_status,
            }
        )

    @action(detail=True, methods=["get"], url_path="download", permission_classes=[permissions.AllowAny])
    def download(self, request, pk=None):
        document = self.get_object()
        if not document.file:
            return Response({"error": "Documento sin archivo"}, status=status.HTTP_404_NOT_FOUND)
        return FileResponse(document.file.open("rb"), as_attachment=True, filename=document.originalname or document.filename)

    @action(detail=True, methods=["get"], url_path="preview", permission_classes=[permissions.AllowAny])
    def preview(self, request, pk=None):
        """Sirve el archivo inline para visualizarlo en el navegador."""
        document = self.get_object()
        if not document.file:
            return Response({"error": "Documento sin archivo"}, status=status.HTTP_404_NOT_FOUND)
        response = FileResponse(document.file.open("rb"), as_attachment=False)
        mime = document.mime_type or "application/octet-stream"
        response["Content-Type"] = mime
        response["Content-Disposition"] = f'inline; filename="{document.originalname or document.filename}"'
        response["X-Frame-Options"] = "SAMEORIGIN"
        response["Content-Security-Policy"] = "frame-ancestors 'self' http://localhost:*"
        return response

    @action(detail=False, methods=["get"], url_path="zip", permission_classes=[permissions.AllowAny])
    def zip(self, request):
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            for doc in Document.objects.exclude(file=""):
                if doc.file:
                    try:
                        with doc.file.open("rb") as f:
                            zf.writestr(doc.originalname or doc.filename, f.read())
                    except Exception:
                        continue
        buffer.seek(0)
        response = HttpResponse(buffer.getvalue(), content_type="application/zip")
        response["Content-Disposition"] = 'attachment; filename="documents.zip"'
        return response
