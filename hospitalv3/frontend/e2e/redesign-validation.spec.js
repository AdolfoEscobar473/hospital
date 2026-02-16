/**
 * E2E Validacion - Frontend Rediseñado HMS v3
 * npx playwright test e2e/redesign-validation.spec.js --reporter=list
 */
// @ts-check
import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:5173";
const CREDS = { username: "admin", password: "admin123" };

async function login(page) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  await page.fill('input[type="text"]', CREDS.username);
  await page.fill('input[type="password"]', CREDS.password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
}

test.describe("Rediseño SGI Hospital - Validacion funcional", () => {
  test("1. Login", async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toContainText(/Ingreso|SGI/i, { timeout: 5000 });
    await page.fill('input[type="text"]', CREDS.username);
    await page.fill('input[type="password"]', CREDS.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    expect(page.url()).not.toContain("/login");
    await expect(page.locator(".app-sidebar, aside")).toBeVisible({ timeout: 5000 });
  });

  test("2. Layout: sidebar, topbar, navegacion", async ({ page }) => {
    await login(page);
    await expect(page.locator(".app-sidebar")).toBeVisible();
    await expect(page.locator(".app-topbar")).toBeVisible();
    await expect(page.locator(".app-content")).toBeVisible();
    const navLinks = page.locator(".side-link, .sidebar-nav a");
    await expect(navLinks.first()).toBeVisible();
    await page.click('a[href="/documents"]');
    await page.waitForTimeout(800);
    await expect(page.locator("h1")).toContainText(/Documentos|Gestion/i);
  });

  test("3. Dashboard: KPIs y listas sin errores", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await expect(page.locator("p.error")).not.toBeVisible();
    await expect(page.locator(".kpi-grid")).toBeVisible({ timeout: 5000 });
    await expect(page.locator(".kpi-grid .kpi-card, .kpi-grid [class*='card']").first()).toBeVisible();
    await expect(page.locator(".SectionCard, .section-card, .two-column-grid, .three-column-grid").first()).toBeVisible();
  });

  test("4a. Documentos: abrir modulo", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/documents`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await expect(page.locator("p.error")).not.toBeVisible();
    await expect(page.locator("h1")).toContainText(/Documentos|Gestion/i);
  });

  test("4b. Documentos: validar filtros (query, proceso, tipo, estado)", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/documents`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await expect(page.locator("text=Filtros y busqueda")).toBeVisible({ timeout: 5000 });
    const queryInput = page.getByPlaceholder(/Nombre|archivo/i);
    await expect(queryInput.first()).toBeVisible();
    const selects = page.locator(".filters-grid select");
    await expect(selects.first()).toBeVisible();
    expect(await selects.count()).toBeGreaterThanOrEqual(2);
  });

  test("4c. Documentos: modal Nuevo documento y campos", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/documents`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Nuevo documento")');
    await page.waitForTimeout(600);
    await expect(page.locator('[role="dialog"] h3:has-text("Nuevo documento")')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.modal-card input[type="file"]')).toBeVisible();
    await expect(page.locator('.modal-card select').first()).toBeVisible();
    await page.click('.modal-card button:has-text("Cancelar")');
    await page.waitForTimeout(300);
  });

  test("4d. Documentos: boton Descargar ZIP (dispara sin error bloqueante)", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/documents`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    const zipBtn = page.locator('button:has-text("Descargar ZIP")');
    await expect(zipBtn).toBeVisible();
    await zipBtn.click();
    await page.waitForTimeout(500);
    const errorMsg = page.locator("p.error");
    await expect(errorMsg).not.toBeVisible();
  });

  test("5a. Comites: abrir modulo", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/committees`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await expect(page.locator("p.error")).not.toBeVisible();
    await expect(page.locator("h1")).toContainText(/Comites|Seguimiento/i);
  });

  test("5b. Comites: crear comite de prueba", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/committees`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Nuevo comite")');
    await page.waitForTimeout(600);
    await expect(page.locator('[role="dialog"] h3:has-text("Nuevo comite")')).toBeVisible({ timeout: 3000 });
    const uniqueName = `Comite Redesign ${Date.now()}`;
    await page.getByLabel("Nombre").first().fill(uniqueName);
    await page.getByLabel("Descripcion").first().fill("Prueba rediseño");
    await page.locator('.modal-card button[type="submit"]').click();
    await page.waitForTimeout(1500);
    await expect(page.locator(".committee-list")).toContainText(uniqueName, { timeout: 5000 });
  });

  test("5c. Comites: seleccionar comite y crear compromiso", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/committees`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    const committeeBtn = page.locator(".committee-item").first();
    if (await committeeBtn.isVisible()) {
      await committeeBtn.click();
      await page.waitForTimeout(1200);
      const commitmentForm = page.locator('form').filter({ has: page.locator('button:has-text("Crear compromiso")') });
      if (await commitmentForm.isVisible()) {
        await commitmentForm.getByLabel("Descripcion").fill("Compromiso prueba rediseño");
        const assignSelect = commitmentForm.getByLabel("Asignado a");
        if (await assignSelect.isVisible()) {
          await assignSelect.selectOption({ index: 0 });
        }
        await commitmentForm.getByRole("button", { name: "Crear compromiso" }).click();
        await page.waitForTimeout(1500);
        const err = page.locator("p.error");
        await expect(err).not.toBeVisible();
        await expect(page.getByText(/Compromiso prueba|rediseño|Compromisos del comite/i).first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("5d. Comites: cambiar estado / cerrar compromiso si aplica", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/committees`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    const committeeBtn = page.locator(".committee-item").first();
    if (await committeeBtn.isVisible()) {
      await committeeBtn.click();
      await page.waitForTimeout(1200);
      const closeBtn = page.locator('button:has-text("Cerrar")').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(1000);
        await expect(page.locator("p.error")).not.toBeVisible();
      }
    }
  });

  test("5e. Comites: sesiones, miembros, recordatorios visibles", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/committees`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await expect(page.getByRole("heading", { name: "Recordatorios" })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Registrar sesion/)).toBeVisible();
  });
});
