"""
Crea un usuario con rol leader para pruebas.
Uso: python manage.py seed_leader_user
     python manage.py seed_leader_user --username lider1 --password Leader123!
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from accounts.models import UserRole

User = get_user_model()


class Command(BaseCommand):
    help = "Crea un usuario con rol leader para pruebas de permisos."

    def add_arguments(self, parser):
        parser.add_argument("--username", default="leader_test")
        parser.add_argument("--password", default="Leader123!")
        parser.add_argument("--email", default="leader@hospital.local")
        parser.add_argument("--name", default="Usuario Lider")

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
        UserRole.objects.create(user=user, role=UserRole.ROLE_LEADER)

        action = "Creado" if created else "Actualizado"
        self.stdout.write(
            self.style.SUCCESS(
                f"{action} usuario con rol leader: {user.username} (password: {options['password']})"
            )
        )
