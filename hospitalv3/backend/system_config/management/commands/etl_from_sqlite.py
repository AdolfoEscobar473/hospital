import json
import sqlite3
import uuid
from pathlib import Path

from django.apps import apps
from django.core.management.base import BaseCommand
from django.db import models, transaction
from django.utils.dateparse import parse_date, parse_datetime
from django.utils.timezone import make_aware


TABLE_MODEL_MAP = {
    "users": "accounts.User",
    "user_roles": "accounts.UserRole",
    "refresh_tokens": "accounts.RefreshTokenRecord",
    "processes": "processes.Process",
    "process_characterization": "processes.ProcessCharacterization",
    "document_types": "documents.DocumentType",
    "documents": "documents.Document",
    "risks": "risks.Risk",
    "risk_matrix_history": "risks.RiskMatrixHistory",
    "actions": "actions.Action",
    "indicators": "indicators.Indicator",
    "indicator_history": "indicators.IndicatorHistory",
    "adverse_events": "adverse_events.AdverseEvent",
    "committees": "committees.Committee",
    "committee_members": "committees.CommitteeMember",
    "committee_sessions": "committees.CommitteeSession",
    "commitments": "committees.Commitment",
    "support_tickets": "support_tickets.SupportTicket",
    "roles_config": "system_config.RoleConfig",
    "catalog_items": "system_config.CatalogItem",
    "column_settings": "system_config.ColumnSetting",
    "smtp_config": "system_config.SMTPConfig",
    "oauth_config": "system_config.OAuthConfig",
    "storage_config": "system_config.StorageConfig",
    "audit_logs": "system_config.AuditLog",
    "email_logs": "system_config.EmailLog",
    "client_logs": "logsapp.ClientLog",
}

KEY_RENAMES = {
    "userid": "user_id",
    "uploaderid": "uploader_id",
    "processid": "process_id",
    "ownerid": "owner_id",
    "createdby": "created_by_id",
    "assignedto": "assigned_to_id",
    "closedby": "closed_by_id",
    "owneruser": "owner_user_id",
    "owneruserid": "owner_user_id",
    "riskid": "risk_id",
    "committeeid": "committee_id",
    "reportedby": "reported_by_id",
    "refid": "ref_id",
    "entityid": "entity_id",
    "entitytype": "entity_type",
    "eventtype": "event_type",
    "useragent": "user_agent",
    "toemail": "to_email",
    "errormessage": "error_message",
    "createdat": "created_at",
    "updatedat": "updated_at",
    "expiresat": "expires_at",
    "joinedat": "joined_at",
    "sessiondate": "session_date",
    "duedate": "due_date",
    "closedat": "closed_at",
    "recordedat": "recorded_at",
    "occurredat": "occurred_at",
    "fileSize": "file_size",
    "mimetype": "mime_type",
    "recordtype": "record_type",
    "detailjson": "details_json",
    "configjson": "config_json",
}


def camel_or_mixed_to_snake(key):
    if key in KEY_RENAMES:
        return KEY_RENAMES[key]
    original = key
    key = key.replace("-", "_")
    chars = []
    for idx, ch in enumerate(key):
        if ch.isupper() and idx > 0 and key[idx - 1] != "_":
            chars.append("_")
        chars.append(ch.lower())
    normalized = "".join(chars)
    return KEY_RENAMES.get(normalized, normalized)


def coerce_value(field, value):
    if value is None:
        return None
    if isinstance(field, models.BooleanField):
        if isinstance(value, bool):
            return value
        if isinstance(value, int):
            return bool(value)
        return str(value).strip().lower() in ("1", "true", "t", "yes", "y")
    if isinstance(field, models.UUIDField):
        if isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(str(value))
    if isinstance(field, models.JSONField):
        if isinstance(value, (dict, list)):
            return value
        if isinstance(value, str):
            value = value.strip()
            if not value:
                return None
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return {"raw": value}
        return value
    if isinstance(field, models.DateTimeField):
        if hasattr(value, "tzinfo"):
            return value
        if isinstance(value, str):
            dt = parse_datetime(value)
            if dt is None:
                return None
            if dt.tzinfo is None:
                return make_aware(dt)
            return dt
    if isinstance(field, models.DateField):
        if hasattr(value, "day"):
            return value
        if isinstance(value, str):
            return parse_date(value)
    if isinstance(field, (models.IntegerField, models.BigIntegerField, models.SmallIntegerField)):
        if value == "":
            return None
        return int(value)
    if isinstance(field, models.FloatField):
        if value == "":
            return None
        return float(value)
    return value


class Command(BaseCommand):
    help = "Importa datos desde SQLite de hospitalv2 hacia PostgreSQL en hospitalv3."

    def add_arguments(self, parser):
        backend_dir = Path(__file__).resolve().parents[3]
        workspace_root = backend_dir.parent.parent
        hospitalv3_root = backend_dir.parent
        parser.add_argument(
            "--sqlite-path",
            dest="sqlite_path",
            default=str((workspace_root / "hospitalv2" / "hospital.db").resolve()),
            help="Ruta absoluta al archivo SQLite legacy.",
        )
        parser.add_argument(
            "--report-path",
            dest="report_path",
            default=str((hospitalv3_root / "docs" / "ETL_RECONCILIATION.json").resolve()),
            help="Ruta del reporte JSON de reconciliacion.",
        )
        parser.add_argument(
            "--truncate",
            action="store_true",
            help="Limpia las tablas objetivo antes de importar.",
        )
        parser.add_argument(
            "--tables",
            nargs="+",
            help="Subset de tablas a importar.",
        )

    def handle(self, *args, **options):
        sqlite_path = Path(options["sqlite_path"])
        report_path = Path(options["report_path"])
        truncate = options["truncate"]
        requested_tables = set(options["tables"] or TABLE_MODEL_MAP.keys())

        if not sqlite_path.exists():
            raise FileNotFoundError(f"No existe SQLite en: {sqlite_path}")

        conn = sqlite3.connect(sqlite_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        report = {"sqlitePath": str(sqlite_path), "tables": []}

        for table_name, model_path in TABLE_MODEL_MAP.items():
            if table_name not in requested_tables:
                continue

            model = apps.get_model(model_path)
            model_fields = {}
            accepted = set()
            for field in model._meta.fields:
                model_fields[field.name] = field
                model_fields[field.attname] = field
                accepted.add(field.name)
                accepted.add(field.attname)

            pk_field = model._meta.pk.attname
            try:
                cursor.execute(f"SELECT * FROM {table_name}")
                rows = cursor.fetchall()
            except sqlite3.Error:
                report["tables"].append(
                    {
                        "table": table_name,
                        "model": model_path,
                        "sourceCount": 0,
                        "imported": 0,
                        "failed": 0,
                        "targetCount": model.objects.count(),
                        "reconciled": False,
                        "skipped": True,
                    }
                )
                self.stdout.write(self.style.WARNING(f"{table_name}: tabla no encontrada en SQLite, se omite"))
                continue

            if truncate:
                model.objects.all().delete()

            imported = 0
            failed = 0

            with transaction.atomic():
                for row in rows:
                    try:
                        normalized = {}
                        for key in row.keys():
                            normalized_key = camel_or_mixed_to_snake(key)
                            normalized[normalized_key] = row[key]

                        payload = {}
                        for key, value in normalized.items():
                            if key not in accepted:
                                continue
                            field = model_fields[key]
                            coerced = coerce_value(field, value)
                            payload[key] = coerced

                        if pk_field not in payload:
                            if "id" in payload:
                                payload[pk_field] = payload["id"]
                            else:
                                raise ValueError(f"PK faltante para {model_path} en tabla {table_name}")

                        pk_value = payload.pop(pk_field)
                        model.objects.update_or_create(**{pk_field: pk_value}, defaults=payload)
                        imported += 1
                    except Exception:
                        failed += 1

            target_count = model.objects.count()
            table_report = {
                "table": table_name,
                "model": model_path,
                "sourceCount": len(rows),
                "imported": imported,
                "failed": failed,
                "targetCount": target_count,
                "reconciled": len(rows) == imported and failed == 0,
            }
            report["tables"].append(table_report)
            self.stdout.write(
                self.style.SUCCESS(
                    f"{table_name}: source={len(rows)} imported={imported} failed={failed} target={target_count}"
                )
            )

        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
        self.stdout.write(self.style.SUCCESS(f"Reporte ETL generado en {report_path}"))
