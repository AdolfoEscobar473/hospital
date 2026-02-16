from rest_framework.permissions import BasePermission

# Roles que pueden escribir (crear/editar/eliminar). Reader solo lectura.
CONTRIBUTOR_ROLES = ("admin", "leader", "collaborator")


class HasAnyRole(BasePermission):
    allowed_roles = ()

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not self.allowed_roles:
            return True
        roles = set(request.user.roles_rel.values_list("role", flat=True))
        return bool(roles.intersection(set(self.allowed_roles)))


class IsAdminOrLeader(HasAnyRole):
    allowed_roles = ("admin", "leader")


class IsAdminOnly(HasAnyRole):
    allowed_roles = ("admin",)


class IsContributorOrReadOnly(BasePermission):
    """Permite GET/HEAD/OPTIONS a todos los autenticados. POST/PUT/PATCH/DELETE solo a admin, leader o collaborator (reader = solo lectura)."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        roles = set(request.user.roles_rel.values_list("role", flat=True))
        return bool(roles.intersection(set(CONTRIBUTOR_ROLES)))
