"""
Seed script: Populates the database with realistic hospital test data.
Run with: python manage.py shell < seed_test_data.py
"""
import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
os.environ["USE_SQLITE"] = "1"
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
if not admin:
    admin = User.objects.create_superuser("admin", "admin@hospital.com", "admin123")
    print("Created admin user")
else:
    print(f"Using existing admin: {admin.username}")

def mkuser(username, name, email):
    u, c = User.objects.get_or_create(username=username, defaults={"email": email, "first_name": name.split()[0], "last_name": " ".join(name.split()[1:])})
    if c:
        u.set_password("test1234")
        u.save()
    return u

users = {
    "mg": mkuser("mgarcia", "Maria Garcia", "mgarcia@hospital.com"),
    "jl": mkuser("jlopez", "Juan Lopez", "jlopez@hospital.com"),
    "ac": mkuser("acastro", "Ana Castro", "acastro@hospital.com"),
    "rm": mkuser("rmorales", "Roberto Morales", "rmorales@hospital.com"),
    "lh": mkuser("lherrera", "Lucia Herrera", "lherrera@hospital.com"),
    "dv": mkuser("dvargas", "Diego Vargas", "dvargas@hospital.com"),
    "pm": mkuser("pmendez", "Patricia Mendez", "pmendez@hospital.com"),
    "fr": mkuser("frios", "Fernando Rios", "frios@hospital.com"),
}
print(f"Users ready: {User.objects.count()}")

print("\n== PROCESSES ==")
P = {}
pdata = [
    ("Gestion al Usuario", "Atencion y seguimiento de necesidades del usuario", "DE-GU", "direccionamiento_estrategico", "Maria Garcia"),
    ("Gestion Gerencial", "Planificacion y direccion estrategica del hospital", "DE-GG", "direccionamiento_estrategico", "Juan Lopez"),
    ("Cultura Organizacional", "Fomento de la cultura institucional y clima laboral", "PM-CO", "proceso_misional", "Ana Castro"),
    ("Gestion de Tecnologia", "Administracion de recursos tecnologicos e innovacion", "PM-GT", "proceso_misional", "Diego Vargas"),
    ("Promocion y Mantenimiento de la Salud", "Programas de prevencion y promocion", "PM-PMS", "proceso_misional", "Lucia Herrera"),
    ("Consulta Externa", "Consultas medicas externas ambulatorias", "PM-CE", "proceso_misional", "Roberto Morales"),
    ("Internacion", "Hospitalizacion de pacientes", "PM-INT", "proceso_misional", "Patricia Mendez"),
    ("Urgencias", "Atencion de urgencias y emergencias", "PM-URG", "proceso_misional", "Fernando Rios"),
    ("Gestion Administrativa y Financiera", "Recursos financieros y administrativos", "PA-GAF", "proceso_apoyo", "Maria Garcia"),
    ("Gestion del Talento Humano", "Seleccion bienestar y desarrollo del personal", "PA-GTH", "proceso_apoyo", "Ana Castro"),
    ("Gestion de Recursos Fisicos", "Infraestructura y mantenimiento", "PA-GRF", "proceso_apoyo", "Diego Vargas"),
    ("Gestion Documental", "Control de documentos y registros", "PA-GD", "proceso_apoyo", "Lucia Herrera"),
    ("Sistemas de Informacion", "Soporte TI e infraestructura digital", "PA-SI", "proceso_apoyo", "Diego Vargas"),
    ("Control Interno", "Evaluacion y auditoria de gestion", "PE-CI", "proceso_evaluacion", "Roberto Morales"),
    ("Mejoramiento Continuo", "Planes de mejora y acciones correctivas", "PE-MC", "proceso_evaluacion", "Patricia Mendez"),
]
for nm, desc, code, cat, resp in pdata:
    p, c = Process.objects.get_or_create(name=nm, defaults={"description": desc, "code": code, "category": cat, "responsible": resp, "status": "activo"})
    P[code] = p
    print(f"  {'NEW' if c else 'ok'} {code} {nm}")

print(f"Total: {Process.objects.count()}")

print("\n== INDICATORS ==")
idata = [
    ("Satisfaccion del usuario", P["DE-GU"], 95, 88, "%", "mensual"),
    ("Tiempo promedio respuesta PQR", P["DE-GU"], 5, 3.2, "dias", "mensual"),
    ("Cumplimiento plan estrategico", P["DE-GG"], 90, 82, "%", "trimestral"),
    ("Eficiencia presupuestal", P["DE-GG"], 95, 91, "%", "trimestral"),
    ("Indice clima laboral", P["PM-CO"], 80, 75, "%", "semestral"),
    ("Horas capacitacion per capita", P["PM-CO"], 40, 32, "horas", "trimestral"),
    ("Disponibilidad sistemas criticos", P["PM-GT"], 99.5, 99.2, "%", "mensual"),
    ("Incidentes TI resueltos en SLA", P["PM-GT"], 95, 89, "%", "mensual"),
    ("Cobertura programas prevencion", P["PM-PMS"], 85, 78, "%", "trimestral"),
    ("Tasa vacunacion completada", P["PM-PMS"], 90, 92, "%", "mensual"),
    ("Consultas atendidas por dia", P["PM-CE"], 120, 115, "consultas", "mensual"),
    ("Tiempo espera consulta externa", P["PM-CE"], 30, 42, "min", "mensual"),
    ("Tasa ocupacion camas", P["PM-INT"], 85, 79, "%", "mensual"),
    ("Estancia promedio hospitalaria", P["PM-INT"], 5, 4.8, "dias", "mensual"),
    ("Tiempo puerta-atencion urgencias", P["PM-URG"], 15, 18, "min", "mensual"),
    ("Mortalidad en urgencias", P["PM-URG"], 2, 1.5, "%", "mensual"),
    ("Ejecucion presupuestal", P["PA-GAF"], 95, 87, "%", "trimestral"),
    ("Rotacion de personal", P["PA-GTH"], 5, 7.2, "%", "trimestral"),
    ("Evaluaciones desempeno completadas", P["PA-GTH"], 100, 85, "%", "semestral"),
    ("Cumplimiento mantenimiento preventivo", P["PA-GRF"], 90, 83, "%", "mensual"),
    ("Documentos actualizados", P["PA-GD"], 100, 92, "%", "trimestral"),
    ("Uptime infraestructura TI", P["PA-SI"], 99.9, 99.7, "%", "mensual"),
    ("Hallazgos cerrados en plazo", P["PE-CI"], 90, 78, "%", "trimestral"),
    ("Acciones mejora implementadas", P["PE-MC"], 85, 72, "%", "trimestral"),
]
for nm, proc, tgt, cur, unit, freq in idata:
    Indicator.objects.get_or_create(name=nm, defaults={"process": proc, "target": tgt, "current": cur, "unit": unit, "frequency": freq})
    print(f"  {nm}: {cur}/{tgt}{unit}")
print(f"Total: {Indicator.objects.count()}")

print("\n== RISKS ==")
rdata = [
    ("Insatisfaccion masiva de usuarios", "Reclamos reiterados sin respuesta oportuna", P["DE-GU"], "high", "medium", "Maria Garcia", "open"),
    ("Falta de alineacion estrategica", "Desconexion entre planeacion y ejecucion", P["DE-GG"], "critical", "low", "Juan Lopez", "open"),
    ("Desvinculacion del talento clave", "Perdida de personal critico", P["PM-CO"], "high", "high", "Ana Castro", "in_progress"),
    ("Falla en sistemas criticos", "Caida de HIS o sistemas vitales", P["PM-GT"], "critical", "medium", "Diego Vargas", "open"),
    ("Brote epidemiologico no controlado", "Falla en programas de prevencion", P["PM-PMS"], "critical", "high", "Lucia Herrera", "open"),
    ("Tiempos de espera excesivos CE", "Demora en atencion consulta externa", P["PM-CE"], "medium", "high", "Roberto Morales", "in_progress"),
    ("Infeccion asociada a atencion en salud", "IAAS en hospitalizacion", P["PM-INT"], "critical", "medium", "Patricia Mendez", "open"),
    ("Saturacion de urgencias", "Colapso por sobredemanda", P["PM-URG"], "high", "high", "Fernando Rios", "open"),
    ("Desfinanciacion operativa", "Deficit presupuestal no previsto", P["PA-GAF"], "critical", "low", "Maria Garcia", "open"),
    ("Alta rotacion de personal", "Fuga de talento humano", P["PA-GTH"], "medium", "medium", "Ana Castro", "in_progress"),
    ("Falla infraestructura fisica", "Deterioro critico de instalaciones", P["PA-GRF"], "high", "medium", "Diego Vargas", "open"),
    ("Documentos desactualizados", "Incumplimiento normativo", P["PA-GD"], "medium", "high", "Lucia Herrera", "in_progress"),
    ("Vulnerabilidad cibernetica", "Ataque o brecha de seguridad", P["PA-SI"], "critical", "medium", "Diego Vargas", "open"),
    ("Hallazgos criticos no resueltos", "Hallazgos sin cierre", P["PE-CI"], "high", "medium", "Roberto Morales", "open"),
    ("Planes de mejora sin seguimiento", "Acciones sin implementacion", P["PE-MC"], "medium", "high", "Patricia Mendez", "in_progress"),
    ("Error en dispensacion de medicamentos", "Riesgo farmacia hospitalaria", P["PM-INT"], "high", "low", "Patricia Mendez", "open"),
    ("Falla en cadena de frio", "Ruptura cadena frio biologicos", P["PM-PMS"], "critical", "low", "Lucia Herrera", "open"),
    ("Caida del sistema de citas", "Perdida agendamiento electronico", P["PM-CE"], "low", "high", "Roberto Morales", "in_progress"),
    ("Perdida historias clinicas", "Extravio documentacion clinica", P["PA-GD"], "critical", "low", "Lucia Herrera", "open"),
    ("Incumplimiento regulatorio INVIMA", "Fallas en reporte a entidades", P["PE-CI"], "high", "medium", "Roberto Morales", "open"),
]
for t, d, proc, sev, prob, own, st in rdata:
    Risk.objects.get_or_create(title=t, defaults={"description": d, "process": proc, "severity": sev, "probability": prob, "owner": own, "status": st})
    print(f"  {t} [{sev}/{prob}]")
print(f"Total: {Risk.objects.count()}")

print("\n== ACTIONS ==")
adata = [
    ("Implementar encuesta digital PQR", "Digitalizar sistema de quejas", P["DE-GU"], "high", "in_progress", 60, 15, "mg"),
    ("Actualizar plan estrategico 2026", "Revision plan cuatrienal", P["DE-GG"], "critical", "open", 20, 30, "jl"),
    ("Programa bienestar laboral Q1", "Actividades bienestar Q1", P["PM-CO"], "medium", "in_progress", 45, 10, "ac"),
    ("Migracion servidor principal", "Upgrade servidor HIS", P["PM-GT"], "critical", "open", 10, 45, "dv"),
    ("Campana vacunacion influenza", "Jornada masiva vacunacion", P["PM-PMS"], "high", "in_progress", 75, 7, "lh"),
    ("Optimizacion agenda consulta externa", "Redistribucion horarios", P["PM-CE"], "medium", "in_progress", 50, 20, "rm"),
    ("Protocolo prevencion IAAS", "Actualizar protocolo manos", P["PM-INT"], "critical", "open", 30, 25, "pm"),
    ("Plan contingencia urgencias", "Plan picos demanda", P["PM-URG"], "high", "in_progress", 40, 12, "fr"),
    ("Revision ejecucion presupuestal", "Auditoria gasto Q4", P["PA-GAF"], "medium", "closed", 100, -5, "mg"),
    ("Plan retencion de talento", "Reducir rotacion", P["PA-GTH"], "high", "in_progress", 35, 60, "ac"),
    ("Mantenimiento planta electrica", "Revision semestral", P["PA-GRF"], "critical", "open", 0, 8, "dv"),
    ("Actualizacion manual de calidad", "Revision documentos SGI", P["PA-GD"], "medium", "in_progress", 65, 18, "lh"),
    ("Implementar firewall nueva gen", "Upgrade seguridad", P["PA-SI"], "critical", "in_progress", 55, 35, "dv"),
    ("Cierre hallazgos auditoria", "Respuesta informe CI", P["PE-CI"], "high", "in_progress", 70, 14, "rm"),
    ("Seguimiento planes mejora Q1", "Verificar acciones correctivas", P["PE-MC"], "medium", "open", 15, 22, "pm"),
    ("Capacitacion humanizacion", "Taller atencion humanizada", P["PM-CE"], "low", "closed", 100, -15, "rm"),
    ("Inventario equipos biomedicos", "Censo equipos", P["PA-GRF"], "medium", "closed", 100, -10, "dv"),
    ("Backup datos criticos", "Respaldo bases datos", P["PA-SI"], "high", "closed", 100, -3, "dv"),
]
for t, d, proc, pri, st, prog, dd, usr in adata:
    Action.objects.get_or_create(title=t, defaults={"description": d, "process": proc, "priority": pri, "status": st, "progress": prog, "due_date": today + timedelta(days=dd), "assigned_to": users[usr]})
    print(f"  {t} [{st} {prog}%]")
print(f"Total: {Action.objects.count()}")

print("\n== COMMITTEES ==")
C = {}
cdata = [
    ("Comite de Calidad y Seguridad del Paciente", "Seguimiento eventos adversos e indicadores seguridad", P["PE-MC"]),
    ("Comite de Etica Hospitalaria", "Resolucion dilemas eticos en atencion en salud", P["DE-GG"]),
    ("Comite de Infecciones", "Vigilancia epidemiologica y control infecciones", P["PM-INT"]),
    ("Comite de Farmacia y Terapeutica", "Gestion uso racional de medicamentos", P["PM-INT"]),
    ("Comite de Historias Clinicas", "Evaluacion calidad registros clinicos", P["PA-GD"]),
    ("Comite de Emergencias y Desastres", "Preparacion y respuesta ante emergencias", P["PM-URG"]),
]
for nm, d, proc in cdata:
    c, cr = Committee.objects.get_or_create(name=nm, defaults={"description": d, "process": proc})
    C[nm] = c
    print(f"  {'NEW' if cr else 'ok'} {nm}")

print("\n== SESSIONS & MEMBERS ==")
ulist = list(users.values())
for nm, com in C.items():
    for i, u in enumerate(ulist[:4]):
        r = "presidente" if i == 0 else ("secretario" if i == 1 else "miembro")
        CommitteeMember.objects.get_or_create(committee=com, user=u, defaults={"role": r})
    for w in [6, 4, 2, 0]:
        sd = today - timedelta(weeks=w)
        notes = ["Aprobacion plan de trabajo trimestre", "Evaluacion eventos periodo anterior", "Analisis casos y revision protocolos", "Revision indicadores y seguimiento compromisos"]
        CommitteeSession.objects.get_or_create(committee=com, session_date=sd, defaults={"notes": notes[w // 2]})
    print(f"  {nm}: 4 members, 4 sessions")

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
        Commitment.objects.get_or_create(committee=C[cn], description=desc, defaults={"assigned_to": users[usr], "due_date": today + timedelta(days=dd), "status": st})
        print(f"  {desc[:45]}... [{st}]")

print("\n== DOCUMENTS ==")
ddata = [
    ("Plan Estrategico 2024-2027.pdf", P["DE-GG"], "approved", "3.0"),
    ("Manual de Atencion al Usuario.pdf", P["DE-GU"], "approved", "2.1"),
    ("Procedimiento PQR.docx", P["DE-GU"], "in_review", "1.5"),
    ("Guia Practica Clinica CE.pdf", P["PM-CE"], "approved", "4.0"),
    ("Protocolo de Triage.pdf", P["PM-URG"], "approved", "3.2"),
    ("Manual de Bioseguridad.pdf", P["PM-INT"], "approved", "5.0"),
    ("Protocolo Lavado de Manos.pdf", P["PM-INT"], "in_review", "2.3"),
    ("Plan Promocion y Prevencion.pdf", P["PM-PMS"], "approved", "2.0"),
    ("Politica Seguridad Informacion.pdf", P["PM-GT"], "approved", "1.0"),
    ("Manual Cultura Organizacional.pdf", P["PM-CO"], "draft", "1.0"),
    ("Manual de Contratacion.pdf", P["PA-GAF"], "approved", "3.1"),
    ("Reglamento Interno Trabajo.pdf", P["PA-GTH"], "approved", "4.0"),
    ("Plan Mantenimiento Hospitalario.pdf", P["PA-GRF"], "in_review", "2.0"),
    ("Tabla Retencion Documental.xlsx", P["PA-GD"], "approved", "1.2"),
    ("Plan Continuidad TI.pdf", P["PA-SI"], "draft", "0.5"),
    ("Informe Auditoria Interna Q4.pdf", P["PE-CI"], "approved", "1.0"),
    ("Plan Mejoramiento Continuo 2026.pdf", P["PE-MC"], "in_review", "1.1"),
    ("Formato Acta de Comite.docx", P["PE-MC"], "approved", "2.0"),
    ("Procedimiento Urgencias Vitales.pdf", P["PM-URG"], "approved", "3.5"),
    ("Guia Farmacologica Institucional.pdf", P["PM-INT"], "approved", "6.0"),
]
for fn, proc, st, ver in ddata:
    Document.objects.get_or_create(originalname=fn, defaults={"filename": fn.lower().replace(" ", "_"), "process": proc, "status": st, "version": ver, "uploader": admin, "uploader_name": "Admin", "file_size": 51200, "mime_type": "application/pdf"})
    print(f"  {fn} [v{ver}]")
print(f"Total: {Document.objects.count()}")

print("\n" + "=" * 60)
print("SEED COMPLETE")
print("=" * 60)
print(f"  Users:       {User.objects.count()}")
print(f"  Processes:   {Process.objects.count()}")
print(f"  Documents:   {Document.objects.count()}")
print(f"  Indicators:  {Indicator.objects.count()}")
print(f"  Risks:       {Risk.objects.count()}")
print(f"  Actions:     {Action.objects.count()}")
print(f"  Committees:  {Committee.objects.count()}")
print(f"  Sessions:    {CommitteeSession.objects.count()}")
print(f"  Commitments: {Commitment.objects.count()}")
print("=" * 60)
