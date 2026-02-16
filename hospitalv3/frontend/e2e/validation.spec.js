/**
 * E2E Validation - HMS v3 Frontend
 * Ejecutar: npx playwright test e2e/validation.spec.js --reporter=list
 * Requiere: npm install -D @playwright/test && npx playwright install chromium
 */
// @ts-check
import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:5173";
const API_URL = "http://localhost:8000";
const CREDS = { username: "admin", password: "admin123" };

const SCREENS = [
  { path: "/documents", name: "Documentos" },
  { path: "/risks", name: "Riesgos" },
  { path: "/actions", name: "Acciones" },
  { path: "/indicators", name: "Indicadores" },
  { path: "/committees", name: "Comites" },
  { path: "/process-map", name: "Mapa procesos" },
  { path: "/ecosystem", name: "Ecosistema" },
  { path: "/search", name: "Buscar" },
  { path: "/my-work", name: "Mi trabajo" },
  { path: "/support", name: "Soporte" },
  { path: "/config", name: "Configuracion" },
];

test.describe("HMS v3 - Validacion funcional", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
  });

  test("1. Login carga correctamente", async ({ page }) => {
    const title = page.locator("h1");
    await expect(title).toContainText(/Ingreso|HMS/i, { timeout: 5000 });
    const form = page.locator("form.auth-card");
    await expect(form).toBeVisible();
    const userInput = page.locator('input[type="text"]');
    await expect(userInput).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("2. Login con admin/admin123 y redireccion a Dashboard", async ({ page }) => {
    await page.fill('input[type="text"]', CREDS.username);
    await page.fill('input[type="password"]', CREDS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(login)?$/, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const url = page.url();
    expect(url).not.toContain("/login");
    const header = page.locator("header.topbar").first();
    await expect(header).toBeVisible({ timeout: 5000 });
    const nav = page.locator("nav.sidebar, aside");
    await expect(nav).toBeVisible({ timeout: 3000 });
  });

  test("3. Dashboard carga sin errores visibles", async ({ page }) => {
    await page.fill('input[type="text"]', CREDS.username);
    await page.fill('input[type="password"]', CREDS.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    const errorMsg = page.locator("p.error");
    await expect(errorMsg).not.toBeVisible();
    const stats = page.locator(".stats-grid, .stat-card");
    await expect(stats.first()).toBeVisible({ timeout: 5000 });
    const loading = page.locator("text=Cargando dashboard");
    await expect(loading).not.toBeVisible({ timeout: 5000 });
  });

  for (const { path, name } of SCREENS) {
    test(`4. Pantalla ${name} (${path}) carga`, async ({ page }) => {
      await page.fill('input[type="text"]', CREDS.username);
      await page.fill('input[type="password"]', CREDS.password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
      await page.goto(`${BASE_URL}${path}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1000);
      const error = page.locator("p.error");
      const hasError = await error.isVisible();
      expect(hasError, `${name}: No deberia mostrar error de carga`).toBe(false);
      const body = page.locator(".page-body").first();
      await expect(body).toBeVisible();
    });
  }

  test("5. Comites - Crear comite de prueba", async ({ page }) => {
    await page.fill('input[type="text"]', CREDS.username);
    await page.fill('input[type="password"]', CREDS.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    await page.goto(`${BASE_URL}/committees`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    const createCommitteeForm = page.locator("form.inline-form").filter({ has: page.locator('button:has-text("Crear")') }).first();
    const uniqueName = `Comite E2E ${Date.now()}`;
    await createCommitteeForm.getByLabel("Nombre").first().fill(uniqueName);
    await createCommitteeForm.getByLabel("Descripcion").first().fill("Prueba de validacion");
    await createCommitteeForm.getByRole("button", { name: "Crear" }).click();
    await page.waitForTimeout(1500);
    const list = page.locator(".simple-list, ul").first();
    await expect(list).toContainText(uniqueName, { timeout: 3000 });
  });

  test("6. Comites - Crear compromiso asignado", async ({ page }) => {
    await page.fill('input[type="text"]', CREDS.username);
    await page.fill('input[type="password"]', CREDS.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    await page.goto(`${BASE_URL}/committees`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    const committeeSelect = page.getByLabel("Comite");
    const options = await committeeSelect.locator("option").allTextContents();
    if (options.length > 1) {
      await committeeSelect.selectOption({ index: 1 });
      const commitmentForm = page.locator("form.inline-form").filter({ has: page.locator('button:has-text("Crear compromiso")') });
      await commitmentForm.getByLabel("Descripcion").fill("Compromiso E2E asignado");
      await commitmentForm.getByRole("button", { name: "Crear compromiso" }).click();
      await page.waitForTimeout(1500);
      const table = page.locator("table tbody");
      await expect(table).toContainText(/Compromiso E2E asignado/i, { timeout: 3000 });
    }
  });

  test("7. Comites - Cerrar compromiso (si existe pendiente)", async ({ page }) => {
    await page.fill('input[type="text"]', CREDS.username);
    await page.fill('input[type="password"]', CREDS.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    await page.goto(`${BASE_URL}/committees`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    const closeBtn = page.locator('button:has-text("Cerrar")').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(1000);
      const error = page.locator("p.error");
      await expect(error).not.toBeVisible();
    }
  });

  test("8. Comites - Seccion recordatorios visible", async ({ page }) => {
    await page.fill('input[type="text"]', CREDS.username);
    await page.fill('input[type="password"]', CREDS.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    await page.goto(`${BASE_URL}/committees`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    const reminders = page.locator("h2:has-text('Recordatorios')");
    await expect(reminders).toBeVisible();
  });
});
