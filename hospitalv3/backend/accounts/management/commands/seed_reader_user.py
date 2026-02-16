"""
Crea un usuario con el rol más bajo (reader) para validar permisos y sesiones.
Uso: python manage.py seed_reader_user
     python manage.py seed_reader_user --username lector --password Test123!
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from accounts.models import UserRole

User = get_user_model()


class Command(BaseCommand):
    help = "Crea un usuario con rol reader (consulta) para pruebas de permisos."

    def add_arguments(self, parser):
        parser.add_argument("--username", default="reader_test")
        parser.add_argument("--password", default="Test123!")
        parser.add_argument("--email", default="reader@hospital.local")
        parser.add_argument("--name", default="Usuario Solo Lectura")

    def handle(self, *args, **options):
        user, created = User.objects.get_or_create(
            username=options["username"],
            defaults={
                "name": options["name"],
                "email": options["email"],
                "is_staff": False,
                "is_superuser": False,
            },
        )
        user.name = options["name"]
        user.email = options["email"]
        user.is_staff = False
        user.is_superuser = False
        user.set_password(options["password"])
        user.is_active = True
        user.save()

        UserRole.objects.filter(user=user).delete()
        UserRole.objects.create(user=user, role=UserRole.ROLE_READER)

        action = "Creado" if created else "Actualizado"
        self.stdout.write(
            self.style.SUCCESS(
                f"{action} usuario con rol reader: {user.username} (password: {options['password']})"
            )
        )
