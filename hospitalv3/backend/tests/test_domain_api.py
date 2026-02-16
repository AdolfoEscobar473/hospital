from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import UserRole
from committees.models import Committee, Commitment
from processes.models import Process

User = get_user_model()


class DomainApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="admin",
            password="admin123",
            name="Admin User",
            email="admin@example.com",
        )
        UserRole.objects.create(user=self.user, role=UserRole.ROLE_ADMIN)

    def test_auth_login_returns_tokens(self):
        response = self.client.post(
            "/api/auth/login",
            {"username": "admin", "password": "admin123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("accessToken", response.data)
        self.assertIn("refreshToken", response.data)

    def test_process_module_crud_and_stats(self):
        self.client.force_authenticate(self.user)
        create_response = self.client.post(
            "/api/processes/",
            {"name": "Gestion Clinica", "description": "Proceso principal", "category": "proceso_misional"},
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        stats_response = self.client.get("/api/processes/statistics/")
        self.assertEqual(stats_response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(stats_response.data["total"], 1)

    def test_documents_zip_endpoint_available(self):
        self.client.force_authenticate(self.user)
        response = self.client.get("/api/documents/zip/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "application/zip")

    def test_commitment_reminders_flow(self):
        self.client.force_authenticate(self.user)
        process = Process.objects.create(name="Calidad", category="proceso_apoyo", created_by=self.user, owner=self.user)
        committee = Committee.objects.create(name="Comite Calidad", process=process, owner_user=self.user)
        Commitment.objects.create(
            committee=committee,
            description="Actualizar matriz de riesgo",
            assigned_to=self.user,
            due_date=timezone.localdate() + timedelta(days=1),
            status="pending",
        )
        response = self.client.get("/api/commitments/reminders/?days=3")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_dashboard_summary_endpoint(self):
        self.client.force_authenticate(self.user)
        response = self.client.get("/api/dashboard/summary")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("processes", response.data)

    def test_reader_cannot_access_users_list(self):
        reader = User.objects.create_user(
            username="reader_test",
            password="Test123!",
            name="Reader",
            email="reader@example.com",
        )
        UserRole.objects.create(user=reader, role=UserRole.ROLE_READER)
        self.client.force_authenticate(reader)
        response = self.client.get("/api/users/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_reset_user_password(self):
        target = User.objects.create_user(
            username="target_user",
            password="OldPass123!",
            name="Target",
            email="target@example.com",
        )
        UserRole.objects.create(user=target, role=UserRole.ROLE_READER)
        self.client.force_authenticate(self.user)
        response = self.client.post(
            f"/api/users/{target.id}/reset-password/",
            {"password": "NewPass456!"},
            format="json",
        )
        self.assertIn(response.status_code, (status.HTTP_200_OK, status.HTTP_204_NO_CONTENT))
        self.client.logout()
        login_resp = self.client.post(
            "/api/auth/login",
            {"username": "target_user", "password": "NewPass456!"},
            format="json",
        )
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        self.assertIn("accessToken", login_resp.data)

    def test_reader_cannot_create_process(self):
        reader = User.objects.create_user(
            username="reader_r", password="Test123!", name="R", email="r@ex.com"
        )
        UserRole.objects.create(user=reader, role=UserRole.ROLE_READER)
        self.client.force_authenticate(reader)
        response = self.client.post(
            "/api/processes/",
            {"name": "Proceso", "description": "D", "category": "proceso_misional"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_reader_can_list_processes(self):
        reader = User.objects.create_user(
            username="reader_r2", password="Test123!", name="R", email="r2@ex.com"
        )
        UserRole.objects.create(user=reader, role=UserRole.ROLE_READER)
        self.client.force_authenticate(reader)
        response = self.client.get("/api/processes/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_collaborator_can_create_process(self):
        collab = User.objects.create_user(
            username="collab_c", password="Colab123!", name="C", email="c@ex.com"
        )
        UserRole.objects.create(user=collab, role=UserRole.ROLE_COLLABORATOR)
        self.client.force_authenticate(collab)
        response = self.client.post(
            "/api/processes/",
            {"name": "Proceso Colab", "description": "D", "category": "proceso_apoyo"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_leader_can_access_users_list(self):
        leader = User.objects.create_user(
            username="leader_l", password="Leader123!", name="L", email="l@ex.com"
        )
        UserRole.objects.create(user=leader, role=UserRole.ROLE_LEADER)
        self.client.force_authenticate(leader)
        response = self.client.get("/api/users/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_reader_cannot_create_risk(self):
        reader = User.objects.create_user(username="reader_r3", password="Test123!", name="R", email="r3@ex.com")
        UserRole.objects.create(user=reader, role=UserRole.ROLE_READER)
        self.client.force_authenticate(reader)
        r = self.client.post("/api/risks/", {"title": "R", "description": "D", "status": "open"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
