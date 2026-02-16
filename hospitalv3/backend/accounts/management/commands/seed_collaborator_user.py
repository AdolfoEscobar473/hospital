"""
Crea un usuario con rol collaborator para pruebas.
Uso: python manage.py seed_collaborator_user
     python manage.py seed_collaborator_user --username colab1 --password Colab123!
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from accounts.models import UserRole

User = get_user_model()


class Command(BaseCommand):
    help = "Crea un usuario con rol collaborator para pruebas de permisos."

    def add_arguments(self, parser):
        parser.add_argument("--username", default="collab_test")
        parser.add_argument("--password", default="Colab123!")
        parser.add_argument("--email", default="collab@hospital.local")
        parser.add_argument("--name", default="Usuario Colaborador")

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
        UserRole.objects.create(user=user, role=UserRole.ROLE_COLLABORATOR)

        action = "Creado" if created else "Actualizado"
        self.stdout.write(
            self.style.SUCCESS(
                f"{action} usuario con rol collaborator: {user.username} (password: {options['password']})"
            )
        )
