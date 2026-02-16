"""
Servicio de envío de correo usando la configuración del sistema (SMTP u OAuth2 M365/Gmail).
Registra cada envío en EmailLog.
Cuando está configurado OAuth2 (Microsoft 365 o Gmail), se usa para envío; si no, se usa SMTP.
"""
import base64
import logging
import smtplib
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr

from django.conf import settings

from .models import EmailLog, OAuthConfig, SMTPConfig

logger = logging.getLogger(__name__)

PROVIDER_SMTP = "smtp"
PROVIDER_M365 = "m365"
PROVIDER_GMAIL = "gmail"


def _get_smtp_config():
    try:
        return SMTPConfig.objects.filter(id=1).first()
    except Exception:
        return None


def _get_oauth_config():
    try:
        return OAuthConfig.objects.filter(id=1).first()
    except Exception:
        return None


def _send_via_smtp(to_email, subject, body_plain, body_html=None, from_email=None, from_name=None, attachments=None):
    """Envía un correo usando la configuración SMTP guardada. attachments: list of {filename, content: bytes, content_type}."""
    smtp = _get_smtp_config()
    if not smtp or not smtp.host or not smtp.port:
        return False, "SMTP no configurado (falta host o puerto)."

    from_addr = from_email or smtp.from_email
    if not from_addr:
        return False, "SMTP: falta correo remitente (from_email)."

    display_name = from_name or smtp.from_name or ""
    use_attachments = attachments and len(attachments) > 0
    msg = MIMEMultipart("mixed" if use_attachments else "alternative")
    msg["Subject"] = subject
    msg["From"] = formataddr((display_name, from_addr)) if display_name else from_addr
    msg["To"] = to_email

    body_part = MIMEMultipart("alternative")
    body_part.attach(MIMEText(body_plain or "", "plain", "utf-8"))
    if body_html:
        body_part.attach(MIMEText(body_html, "html", "utf-8"))
    msg.attach(body_part)

    if use_attachments:
        for att in attachments:
            filename = att.get("filename") or "adjunto"
            content = att.get("content") or b""
            content_type = att.get("content_type") or "application/octet-stream"
            main, sub = (content_type.split("/", 1) + ["octet-stream"])[:2]
            part = MIMEBase(main, sub)
            part.set_payload(content)
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", "attachment", filename=filename)
            msg.attach(part)

    try:
        use_tls = getattr(smtp, "use_tls", True)
        if use_tls:
            server = smtplib.SMTP(smtp.host, int(smtp.port), timeout=30)
            server.starttls()
        else:
            server = smtplib.SMTP(smtp.host, int(smtp.port), timeout=30)
        if smtp.username and smtp.password:
            server.login(smtp.username, smtp.password)
        server.sendmail(from_addr, [to_email], msg.as_string())
        server.quit()
        return True, None
    except smtplib.SMTPAuthenticationError as e:
        return False, str(e)
    except smtplib.SMTPException as e:
        return False, str(e)
    except Exception as e:
        logger.exception("Error enviando correo SMTP")
        return False, str(e)


def _send_via_m365(to_email, subject, body_plain, body_html=None, from_email=None, from_name=None, attachments=None):
    """Envía un correo usando Microsoft 365 (Graph API) con OAuth2 de aplicación. attachments: list of {filename, content: bytes}."""
    import requests

    oauth = _get_oauth_config()
    if not oauth or not all([oauth.tenant_id, oauth.client_id, oauth.client_secret, oauth.sender_email]):
        return False, "OAuth2 M365 incompleto (Tenant ID, Client ID, Client Secret, Sender Email)."

    try:
        import msal
    except ImportError:
        return False, "Librería msal no instalada. Ejecuta: pip install msal."

    sender = from_email or oauth.sender_email
    authority = f"https://login.microsoftonline.com/{oauth.tenant_id}"
    app = msal.ConfidentialClientApplication(
        client_id=oauth.client_id,
        authority=authority,
        client_credential=oauth.client_secret,
    )
    result = app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
    if "access_token" not in result:
        msg = result.get("error_description") or result.get("error") or "No se pudo obtener token."
        return False, f"Token M365: {msg}"

    body_content = body_html if body_html else (body_plain or "")
    content_type = "html" if body_html else "text"
    message = {
        "subject": subject,
        "body": {"contentType": content_type, "content": body_content},
        "toRecipients": [{"emailAddress": {"address": to_email}}],
    }
    if attachments and len(attachments) > 0:
        message["attachments"] = [
            {
                "@odata.type": "#microsoft.graph.fileAttachment",
                "name": att.get("filename") or "adjunto",
                "contentBytes": base64.b64encode(att.get("content") or b"").decode("ascii"),
            }
            for att in attachments
        ]
    url = f"https://graph.microsoft.com/v1.0/users/{sender}/sendMail"
    payload = {"message": message, "saveToSentItems": False}

    resp = requests.post(
        url,
        headers={"Authorization": f"Bearer {result['access_token']}", "Content-Type": "application/json"},
        json=payload,
        timeout=15,
    )
    if resp.status_code >= 400:
        return False, f"Graph ({resp.status_code}): {resp.text}"
    return True, None


def _send_via_gmail_oauth(to_email, subject, body_plain, body_html=None, from_email=None, from_name=None, attachments=None):
    """Gmail OAuth2 aún no implementado; devuelve error para usar fallback SMTP."""
    return False, "Envío por Gmail OAuth2 no implementado. Configura SMTP o usa Microsoft 365."


def send_email(
    to_email,
    subject,
    body_plain,
    body_html=None,
    event_type="notification",
    user=None,
    attachments=None,
):
    """
    Envía un correo usando la fuente configurada: OAuth2 (M365 o Gmail) o SMTP.
    - Si OAuth2 está en M365 y completo → envía vía Microsoft Graph.
    - Si OAuth2 está en Gmail → por ahora intenta SMTP como fallback; si no hay SMTP, error.
    - En resto → SMTP.
    Crea un registro en EmailLog (éxito o fallo).
    """
    if not to_email or not subject:
        return False, "Faltan destinatario o asunto."

    oauth = _get_oauth_config()
    smtp = _get_smtp_config()
    provider = PROVIDER_SMTP
    success = False
    error_message = None

    if oauth and (oauth.provider or "").lower() == "m365":
        provider = PROVIDER_M365
        success, error_message = _send_via_m365(to_email, subject, body_plain, body_html, attachments=attachments)
    elif oauth and (oauth.provider or "").lower() == "gmail":
        provider = PROVIDER_GMAIL
        success, error_message = _send_via_gmail_oauth(to_email, subject, body_plain, body_html, attachments=attachments)
        if not success and smtp and smtp.host and smtp.port and smtp.from_email:
            provider = PROVIDER_SMTP
            success, error_message = _send_via_smtp(to_email, subject, body_plain, body_html, attachments=attachments)
    else:
        success, error_message = _send_via_smtp(to_email, subject, body_plain, body_html, attachments=attachments)

    try:
        EmailLog.objects.create(
            event_type=event_type,
            provider=provider,
            to_email=to_email,
            subject=subject[:255],
            status="sent" if success else "failed",
            error_message=error_message,
            user=user,
        )
    except Exception as e:
        logger.warning("No se pudo crear EmailLog: %s", e)

    if not success:
        return False, error_message or "Error desconocido al enviar."
    return True, None
