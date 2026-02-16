from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from accounts.models import UserRole
from system_config.models import RoleConfig

User = get_user_model()


class Command(BaseCommand):
    help = "Crea usuario administrador y roles base para hospitalv3."

    def add_arguments(self, parser):
        parser.add_argument("--username", default="admin")
        parser.add_argument("--password", default="admin123")
        parser.add_argument("--email", default="admin@hospital.local")
        parser.add_argument("--name", default="Administrador")

    def handle(self, *args, **options):
        base_roles = [
            ("admin", "Administrador"),
            ("leader", "Lider"),
            ("collaborator", "Colaborador"),
            ("reader", "Consulta"),
        ]
        for code, name in base_roles:
            RoleConfig.objects.update_or_create(code=code, defaults={"name": name})

        user, created = User.objects.get_or_create(
            username=options["username"],
            defaults={
                "name": options["name"],
                "email": options["email"],
                "is_staff": True,
                "is_superuser": True,
            },
        )
        user.name = options["name"]
        user.email = options["email"]
        user.is_staff = True
        user.is_superuser = True
        user.set_password(options["password"])
        user.save()

        UserRole.objects.get_or_create(user=user, role=UserRole.ROLE_ADMIN)

        action = "creado" if created else "actualizado"
        self.stdout.write(self.style.SUCCESS(f"Usuario admin {action}: {user.username}"))
