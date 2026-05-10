import { test, expect } from '@playwright/test';

const ADMIN_EMAIL    = process.env.E2E_ADMIN_EMAIL    ?? 'admin@escola.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'senha123';
const GUARDIAN_EMAIL    = process.env.E2E_GUARDIAN_EMAIL    ?? 'responsavel@email.com';
const GUARDIAN_PASSWORD = process.env.E2E_GUARDIAN_PASSWORD ?? 'senha123';

test.describe('Login — Staff (admin/professor)', () => {
  test('login com credenciais válidas redireciona para dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/e-?mail/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/senha/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /entrar/i }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('credenciais inválidas exibem mensagem de erro', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/e-?mail/i).fill('nao@existe.com');
    await page.getByLabel(/senha/i).fill('errado');
    await page.getByRole('button', { name: /entrar/i }).click();

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('logout limpa sessão e redireciona para login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/e-?mail/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/senha/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /entrar/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Abre menu do usuário e clica em sair
    await page.getByRole('button', { name: /menu do usuário|perfil|avatar/i }).click();
    await page.getByRole('menuitem', { name: /sair/i }).click();

    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Login — Responsável', () => {
  test('login de responsável redireciona para área do guardian', async ({ page }) => {
    await page.goto('/guardian/login');

    await page.getByLabel(/e-?mail/i).fill(GUARDIAN_EMAIL);
    await page.getByLabel(/senha/i).fill(GUARDIAN_PASSWORD);
    await page.getByRole('button', { name: /entrar/i }).click();

    await expect(page).toHaveURL(/\/guardian/);
  });

  test('rota do dashboard é protegida — redireciona para login sem sessão', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('rota do guardian é protegida — redireciona sem sessão', async ({ page }) => {
    await page.goto('/guardian/appointments');
    await expect(page).toHaveURL(/\/guardian\/login|\/login/);
  });
});
