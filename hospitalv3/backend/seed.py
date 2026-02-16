import os, django
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings"
os.environ["USE_SQLITE"] = "true"
django.setup()

from datetime import date, timedelta
from django.contrib.auth import get_user_model
from processes.models import Process
from indicators.models import Indicator
from risks.models import Risk
from actions.models import Action
from committees.models import Committee, CommitteeSession, Commitment, CommitteeMember
from documents.models import Document

User = get_user_model()
today = date.today()
admin = User.objects.filter(is_superuser=True).first()

def mu(un, fn, ln, em):
    u, c = User.objects.get_or_create(username=un, defaults={"email": em, "first_name": fn, "last_name": ln})
    if c:
        u.set_password("test1234")
        u.save()
    return u

U = {
    "mg": mu("mgarcia", "Maria", "Garcia", "mgarcia@hospital.com"),
    "jl": mu("jlopez", "Juan", "Lopez", "jlopez@hospital.com"),
    "ac": mu("acastro", "Ana", "Castro", "acastro@hospital.com"),
    "rm": mu("rmorales", "Roberto", "Morales", "rmorales@hospital.com"),
    "lh": mu("lherrera", "Lucia", "Herrera", "lherrera@hospital.com"),
    "dv": mu("dvargas", "Diego", "Vargas", "dvargas@hospital.com"),
    "pm": mu("pmendez", "Patricia", "Mendez", "pmendez@hospital.com"),
    "fr": mu("frios", "Fernando", "Rios", "frios@hospital.com"),
}

# ── PROCESSES ──
print("== PROCESSES ==")
new_procs = [
    ("Cultura Organizacional", "Fomento de la cultura institucional y clima laboral", "PM-CO", "proceso_misional", "Ana Castro"),
    ("Gestion de Tecnologia", "Administracion de recursos tecnologicos e innovacion", "PM-GT", "proceso_misional", "Diego Vargas"),
    ("Urgencias", "Atencion de urgencias y emergencias", "PM-URG", "proceso_misional", "Fernando Rios"),
    ("Gestion Documental", "Control de documentos y registros", "PA-GD", "proceso_apoyo", "Lucia Herrera"),
    ("Control Interno", "Evaluacion y auditoria de gestion", "PE-CI", "proceso_evaluacion", "Roberto Morales"),
]
for nm, desc, code, cat, resp in new_procs:
    p, c = Process.objects.get_or_create(name=nm, defaults={"description": desc, "code": code, "category": cat, "responsible": resp, "status": "activo"})
    tag = "NEW" if c else "ok"
    print(f"  {tag} {code} {nm}")

ups = {"DE-GU": "Maria Garcia", "DE-GG": "Juan Lopez", "PM-CE": "Roberto Morales", "PM-INT": "Patricia Mendez", "PM-PMS": "Lucia Herrera", "PA-GAF": "Maria Garcia", "PA-GTH": "Ana Castro", "PA-GRF": "Diego Vargas", "PA-SI": "Diego Vargas", "PE-MC": "Patricia Mendez"}
for code, resp in ups.items():
    Process.objects.filter(code=code).update(responsible=resp)

P = {p.code: p for p in Process.objects.all()}
print(f"Total: {Process.objects.count()}")

# ── INDICATORS ──
print("\n== INDICATORS ==")
idata = [
    ("Satisfaccion del usuario", "DE-GU", 95, 88, "%", "mensual"),
    ("Tiempo promedio respuesta PQR", "DE-GU", 5, 3.2, "dias", "mensual"),
    ("Cumplimiento plan estrategico", "DE-GG", 90, 82, "%", "trimestral"),
    ("Eficiencia presupuestal", "DE-GG", 95, 91, "%", "trimestral"),
    ("Indice clima laboral", "PM-CO", 80, 75, "%", "semestral"),
    ("Horas capacitacion per capita", "PM-CO", 40, 32, "horas", "trimestral"),
    ("Disponibilidad sistemas criticos", "PM-GT", 99.5, 99.2, "%", "mensual"),
    ("Incidentes TI resueltos en SLA", "PM-GT", 95, 89, "%", "mensual"),
    ("Cobertura programas prevencion", "PM-PMS", 85, 78, "%", "trimestral"),
    ("Tasa vacunacion completada", "PM-PMS", 90, 92, "%", "mensual"),
    ("Consultas atendidas por dia", "PM-CE", 120, 115, "consultas", "mensual"),
    ("Tiempo espera consulta externa", "PM-CE", 30, 42, "min", "mensual"),
    ("Tasa ocupacion camas", "PM-INT", 85, 79, "%", "mensual"),
    ("Estancia promedio hospitalaria", "PM-INT", 5, 4.8, "dias", "mensual"),
    ("Tiempo puerta-atencion urgencias", "PM-URG", 15, 18, "min", "mensual"),
    ("Mortalidad en urgencias", "PM-URG", 2, 1.5, "%", "mensual"),
    ("Ejecucion presupuestal", "PA-GAF", 95, 87, "%", "trimestral"),
    ("Rotacion de personal", "PA-GTH", 5, 7.2, "%", "trimestral"),
    ("Evaluaciones desempeno completadas", "PA-GTH", 100, 85, "%", "semestral"),
    ("Cumplimiento mantenimiento preventivo", "PA-GRF", 90, 83, "%", "mensual"),
    ("Documentos actualizados", "PA-GD", 100, 92, "%", "trimestral"),
    ("Uptime infraestructura TI", "PA-SI", 99.9, 99.7, "%", "mensual"),
    ("Hallazgos cerrados en plazo", "PE-CI", 90, 78, "%", "trimestral"),
    ("Acciones mejora implementadas", "PE-MC", 85, 72, "%", "trimestral"),
]
for nm, pc, tgt, cur, unit, freq in idata:
    proc = P.get(pc)
    if not proc:
        print(f"  SKIP {nm} - process {pc} not found")
        continue
    Indicator.objects.get_or_create(name=nm, defaults={"process": proc, "target": tgt, "current": cur, "unit": unit, "frequency": freq})
print(f"Total: {Indicator.objects.count()}")

# ── RISKS ──
print("\n== RISKS ==")
rdata = [
    ("Insatisfaccion masiva de usuarios", "Reclamos reiterados sin respuesta oportuna", "DE-GU", "high", "medium", "Maria Garcia", "open"),
    ("Falta de alineacion estrategica", "Desconexion entre planeacion y ejecucion", "DE-GG", "critical", "low", "Juan Lopez", "open"),
    ("Desvinculacion del talento clave", "Perdida de personal critico", "PM-CO", "high", "high", "Ana Castro", "in_progress"),
    ("Falla en sistemas criticos", "Caida de HIS o sistemas vitales", "PM-GT", "critical", "medium", "Diego Vargas", "open"),
    ("Brote epidemiologico no controlado", "Falla en programas de prevencion", "PM-PMS", "critical", "high", "Lucia Herrera", "open"),
    ("Tiempos de espera excesivos CE", "Demora en atencion consulta externa", "PM-CE", "medium", "high", "Roberto Morales", "in_progress"),
    ("Infeccion asociada a atencion en salud", "IAAS en hospitalizacion", "PM-INT", "critical", "medium", "Patricia Mendez", "open"),
    ("Saturacion de urgencias", "Colapso por sobredemanda", "PM-URG", "high", "high", "Fernando Rios", "open"),
    ("Desfinanciacion operativa", "Deficit presupuestal no previsto", "PA-GAF", "critical", "low", "Maria Garcia", "open"),
    ("Alta rotacion de personal", "Fuga de talento humano", "PA-GTH", "medium", "medium", "Ana Castro", "in_progress"),
    ("Falla infraestructura fisica", "Deterioro critico de instalaciones", "PA-GRF", "high", "medium", "Diego Vargas", "open"),
    ("Documentos desactualizados", "Incumplimiento normativo", "PA-GD", "medium", "high", "Lucia Herrera", "in_progress"),
    ("Vulnerabilidad cibernetica", "Ataque o brecha de seguridad", "PA-SI", "critical", "medium", "Diego Vargas", "open"),
    ("Hallazgos criticos no resueltos", "Hallazgos sin cierre", "PE-CI", "high", "medium", "Roberto Morales", "open"),
    ("Planes de mejora sin seguimiento", "Acciones sin implementacion", "PE-MC", "medium", "high", "Patricia Mendez", "in_progress"),
    ("Error en dispensacion medicamentos", "Riesgo farmacia hospitalaria", "PM-INT", "high", "low", "Patricia Mendez", "open"),
    ("Falla en cadena de frio", "Ruptura cadena frio biologicos", "PM-PMS", "critical", "low", "Lucia Herrera", "open"),
    ("Caida del sistema de citas", "Perdida agendamiento electronico", "PM-CE", "low", "high", "Roberto Morales", "in_progress"),
    ("Perdida historias clinicas", "Extravio documentacion clinica", "PA-GD", "critical", "low", "Lucia Herrera", "open"),
    ("Incumplimiento regulatorio INVIMA", "Fallas en reporte a entidades", "PE-CI", "high", "medium", "Roberto Morales", "open"),
]
for t, d, pc, sev, prob, own, st in rdata:
    proc = P.get(pc)
    if not proc:
        continue
    Risk.objects.get_or_create(title=t, defaults={"description": d, "process": proc, "severity": sev, "probability": prob, "owner": own, "status": st})
print(f"Total: {Risk.objects.count()}")

# ── ACTIONS ──
print("\n== ACTIONS ==")
adata = [
    ("Implementar encuesta digital PQR", "Digitalizar sistema de quejas", "DE-GU", "high", "in_progress", 60, 15, "mg"),
    ("Actualizar plan estrategico 2026", "Revision plan cuatrienal", "DE-GG", "critical", "open", 20, 30, "jl"),
    ("Programa bienestar laboral Q1", "Actividades bienestar Q1", "PM-CO", "medium", "in_progress", 45, 10, "ac"),
    ("Migracion servidor principal", "Upgrade servidor HIS", "PM-GT", "critical", "open", 10, 45, "dv"),
    ("Campana vacunacion influenza", "Jornada masiva vacunacion", "PM-PMS", "high", "in_progress", 75, 7, "lh"),
    ("Optimizacion agenda consulta", "Redistribucion horarios", "PM-CE", "medium", "in_progress", 50, 20, "rm"),
    ("Protocolo prevencion IAAS", "Actualizar protocolo manos", "PM-INT", "critical", "open", 30, 25, "pm"),
    ("Plan contingencia urgencias", "Plan picos demanda", "PM-URG", "high", "in_progress", 40, 12, "fr"),
    ("Revision ejecucion presupuestal", "Auditoria gasto Q4", "PA-GAF", "medium", "closed", 100, -5, "mg"),
    ("Plan retencion de talento", "Reducir rotacion", "PA-GTH", "high", "in_progress", 35, 60, "ac"),
    ("Mantenimiento planta electrica", "Revision semestral", "PA-GRF", "critical", "open", 0, 8, "dv"),
    ("Actualizacion manual calidad", "Revision documentos SGI", "PA-GD", "medium", "in_progress", 65, 18, "lh"),
    ("Implementar firewall nueva gen", "Upgrade seguridad", "PA-SI", "critical", "in_progress", 55, 35, "dv"),
    ("Cierre hallazgos auditoria", "Respuesta informe CI", "PE-CI", "high", "in_progress", 70, 14, "rm"),
    ("Seguimiento planes mejora Q1", "Verificar correctivas", "PE-MC", "medium", "open", 15, 22, "pm"),
    ("Capacitacion humanizacion", "Taller atencion humanizada", "PM-CE", "low", "closed", 100, -15, "rm"),
    ("Inventario equipos biomedicos", "Censo equipos", "PA-GRF", "medium", "closed", 100, -10, "dv"),
    ("Backup datos criticos", "Respaldo bases datos", "PA-SI", "high", "closed", 100, -3, "dv"),
]
for t, d, pc, pri, st, prog, dd, usr in adata:
    proc = P.get(pc)
    if not proc:
        continue
    Action.objects.get_or_create(title=t, defaults={"description": d, "process": proc, "priority": pri, "status": st, "progress": prog, "due_date": today + timedelta(days=dd), "assigned_to": U[usr]})
print(f"Total: {Action.objects.count()}")

# ── COMMITTEES ──
print("\n== COMMITTEES ==")
C = {}
cdata = [
    ("Comite de Calidad y Seguridad del Paciente", "Seguimiento eventos adversos e indicadores seguridad", "PE-MC"),
    ("Comite de Etica Hospitalaria", "Resolucion dilemas eticos en atencion en salud", "DE-GG"),
    ("Comite de Infecciones", "Vigilancia epidemiologica y control infecciones", "PM-INT"),
    ("Comite de Farmacia y Terapeutica", "Gestion uso racional de medicamentos", "PM-INT"),
    ("Comite de Historias Clinicas", "Evaluacion calidad registros clinicos", "PA-GD"),
    ("Comite de Emergencias y Desastres", "Preparacion y respuesta ante emergencias", "PM-URG"),
]
for nm, d, pc in cdata:
    proc = P.get(pc)
    c, cr = Committee.objects.get_or_create(name=nm, defaults={"description": d, "process": proc})
    C[nm] = c
    print(f"  {nm}")

# Members + Sessions
ulist = list(U.values())
for nm, com in C.items():
    for i, u in enumerate(ulist[:4]):
        r = "presidente" if i == 0 else ("secretario" if i == 1 else "miembro")
        CommitteeMember.objects.get_or_create(committee=com, user=u, defaults={"role": r})
    notes = ["Aprobacion plan trabajo trimestre", "Evaluacion eventos periodo anterior", "Analisis casos y revision protocolos", "Revision indicadores y seguimiento"]
    for w in [6, 4, 2, 0]:
        sd = today - timedelta(weeks=w)
        CommitteeSession.objects.get_or_create(committee=com, session_date=sd, defaults={"notes": notes[w // 2]})

print(f"Total committees: {Committee.objects.count()}")
print(f"Total sessions: {CommitteeSession.objects.count()}")

# ── COMMITMENTS ──
print("\n== COMMITMENTS ==")
cmdata = [
    ("Comite de Calidad y Seguridad del Paciente", [
        ("Actualizar matriz riesgos del paciente", "pm", 10, "in_progress"),
        ("Informe trimestral eventos adversos", "lh", 5, "pending"),
        ("Socializar protocolo identificacion paciente", "rm", -3, "completed"),
        ("Capacitacion metas seguridad", "ac", 20, "pending"),
    ]),
    ("Comite de Etica Hospitalaria", [
        ("Revisar caso consentimiento informado", "jl", 7, "pending"),
        ("Actualizar manual etica institucional", "mg", 30, "in_progress"),
    ]),
    ("Comite de Infecciones", [
        ("Analizar brote IAAS en UCI", "pm", 3, "in_progress"),
        ("Implementar ronda higiene manos", "lh", 14, "pending"),
        ("Resultados cultivos Q4", "fr", -7, "completed"),
    ]),
    ("Comite de Farmacia y Terapeutica", [
        ("Evaluar inclusion nuevo antibiotico", "rm", 21, "pending"),
        ("Revisar alertas INVIMA del mes", "pm", 10, "in_progress"),
    ]),
    ("Comite de Historias Clinicas", [
        ("Auditoria historias clinicas urgencias", "lh", 15, "pending"),
        ("Capacitacion diligenciamiento RIPS", "ac", 25, "pending"),
        ("Correccion hallazgos auditoria anterior", "dv", -2, "completed"),
    ]),
    ("Comite de Emergencias y Desastres", [
        ("Simulacro evacuacion semestral", "fr", 12, "in_progress"),
        ("Actualizar plan hospitalario emergencias", "dv", 45, "pending"),
    ]),
]
for cn, comms in cmdata:
    for desc, usr, dd, st in comms:
        Commitment.objects.get_or_create(committee=C[cn], description=desc, defaults={"assigned_to": U[usr], "due_date": today + timedelta(days=dd), "status": st})
print(f"Total commitments: {Commitment.objects.count()}")

# ── DOCUMENTS ──
print("\n== DOCUMENTS ==")
ddata = [
    ("Plan Estrategico 2024-2027.pdf", "DE-GG", "approved", "3.0"),
    ("Manual de Atencion al Usuario.pdf", "DE-GU", "approved", "2.1"),
    ("Procedimiento PQR.docx", "DE-GU", "in_review", "1.5"),
    ("Guia Practica Clinica CE.pdf", "PM-CE", "approved", "4.0"),
    ("Protocolo de Triage.pdf", "PM-URG", "approved", "3.2"),
    ("Manual de Bioseguridad.pdf", "PM-INT", "approved", "5.0"),
    ("Protocolo Lavado de Manos.pdf", "PM-INT", "in_review", "2.3"),
    ("Plan Promocion y Prevencion.pdf", "PM-PMS", "approved", "2.0"),
    ("Politica Seguridad Informacion.pdf", "PM-GT", "approved", "1.0"),
    ("Manual Cultura Organizacional.pdf", "PM-CO", "draft", "1.0"),
    ("Manual de Contratacion.pdf", "PA-GAF", "approved", "3.1"),
    ("Reglamento Interno Trabajo.pdf", "PA-GTH", "approved", "4.0"),
    ("Plan Mantenimiento Hospitalario.pdf", "PA-GRF", "in_review", "2.0"),
    ("Tabla Retencion Documental.xlsx", "PA-GD", "approved", "1.2"),
    ("Plan Continuidad TI.pdf", "PA-SI", "draft", "0.5"),
    ("Informe Auditoria Interna Q4.pdf", "PE-CI", "approved", "1.0"),
    ("Plan Mejoramiento Continuo 2026.pdf", "PE-MC", "in_review", "1.1"),
    ("Formato Acta de Comite.docx", "PE-MC", "approved", "2.0"),
    ("Procedimiento Urgencias Vitales.pdf", "PM-URG", "approved", "3.5"),
    ("Guia Farmacologica Institucional.pdf", "PM-INT", "approved", "6.0"),
]
for fn, pc, st, ver in ddata:
    proc = P.get(pc)
    if not proc:
        continue
    Document.objects.get_or_create(originalname=fn, defaults={"filename": fn.lower().replace(" ", "_"), "process": proc, "status": st, "version": ver, "uploader": admin, "uploader_name": "Admin", "file_size": 51200, "mime_type": "application/pdf"})
print(f"Total documents: {Document.objects.count()}")

# ── SUMMARY ──
print("\n" + "=" * 50)
print("SEED COMPLETE")
print("=" * 50)
print(f"  Users:       {User.objects.count()}")
print(f"  Processes:   {Process.objects.count()}")
print(f"  Documents:   {Document.objects.count()}")
print(f"  Indicators:  {Indicator.objects.count()}")
print(f"  Risks:       {Risk.objects.count()}")
print(f"  Actions:     {Action.objects.count()}")
print(f"  Committees:  {Committee.objects.count()}")
print(f"  Sessions:    {CommitteeSession.objects.count()}")
print(f"  Commitments: {Commitment.objects.count()}")
print("=" * 50)
