import { test, expect, Page } from '@playwright/test';

const ADMIN_EMAIL    = process.env.E2E_ADMIN_EMAIL    ?? 'admin@escola.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'senha123';
const GUARDIAN_EMAIL    = process.env.E2E_GUARDIAN_EMAIL    ?? 'responsavel@email.com';
const GUARDIAN_PASSWORD = process.env.E2E_GUARDIAN_PASSWORD ?? 'senha123';

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/e-?mail/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/senha/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /entrar/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function loginAsGuardian(page: Page) {
  await page.goto('/guardian/login');
  await page.getByLabel(/e-?mail/i).fill(GUARDIAN_EMAIL);
  await page.getByLabel(/senha/i).fill(GUARDIAN_PASSWORD);
  await page.getByRole('button', { name: /entrar/i }).click();
  await expect(page).toHaveURL(/\/guardian/);
}

test.describe('Agendamentos — Staff', () => {
  test('admin cria slot avulso', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard/appointments');

    await page.getByRole('button', { name: /novo horário|criar horário/i }).click();

    await page.getByLabel(/título/i).fill('Atendimento E2E');

    // Preenche data/hora (input type=datetime-local ou separado)
    const dateInput = page.locator('input[name="startsAt"], input[type="datetime-local"]').first();
    await dateInput.fill('2030-06-15T10:00');

    await page.getByRole('button', { name: /salvar|criar/i }).click();

    await expect(page.getByText('Atendimento E2E')).toBeVisible();
  });

  test('admin cria série semanal', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard/appointments');

    await page.getByRole('button', { name: /novo horário|criar horário/i }).click();
    await page.getByLabel(/título/i).fill('Série Semanal E2E');

    const dateInput = page.locator('input[name="startsAt"], input[type="datetime-local"]').first();
    await dateInput.fill('2030-07-02T09:00');

    // Ativa recorrência
    await page.getByLabel(/recorrência/i).click();
    await page.getByRole('option', { name: /semanal/i }).click();

    // Seleciona quarta-feira
    await page.getByRole('button', { name: /qua/i }).click();

    await page.getByLabel(/até|repetir até/i).fill('2030-07-31');

    await page.getByRole('button', { name: /salvar|criar/i }).click();

    // Deve aparecer badge de recorrente e múltiplos slots
    await expect(page.getByText(/recorrente/i).first()).toBeVisible();
  });

  test('admin cancela slot avulso', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard/appointments');

    // Cria slot primeiro
    await page.getByRole('button', { name: /novo horário|criar horário/i }).click();
    await page.getByLabel(/título/i).fill('Cancelar Este E2E');
    const dateInput = page.locator('input[name="startsAt"], input[type="datetime-local"]').first();
    await dateInput.fill('2030-08-01T14:00');
    await page.getByRole('button', { name: /salvar|criar/i }).click();
    await expect(page.getByText('Cancelar Este E2E')).toBeVisible();

    // Abre menu de ações e cancela
    await page.getByText('Cancelar Este E2E').locator('..').getByRole('button', { name: /cancelar/i }).click();
    await expect(page.getByText(/cancelado/i)).toBeVisible();
  });
});

test.describe('Agendamentos — Responsável', () => {
  test('responsável vê slots disponíveis', async ({ page }) => {
    await loginAsGuardian(page);
    await page.goto('/guardian/appointments');

    // Aba de horários disponíveis deve estar visível
    await expect(page.getByRole('tab', { name: /disponíveis/i })).toBeVisible();
  });

  test('responsável reserva slot disponível', async ({ page }) => {
    await loginAsGuardian(page);
    await page.goto('/guardian/appointments');

    // Clica na aba de disponíveis
    await page.getByRole('tab', { name: /disponíveis/i }).click();

    // Verifica se existe ao menos um slot listado (depende de dados de seed)
    const slotCards = page.locator('[data-testid="slot-card"], .slot-card, [aria-label*="slot"]');
    const count = await slotCards.count();

    if (count === 0) {
      test.skip(); // Sem slots disponíveis no ambiente — pula
      return;
    }

    // Clica em reservar no primeiro slot
    await slotCards.first().getByRole('button', { name: /reservar/i }).click();

    // Modal de confirmação — seleciona aluno
    const studentSelect = page.getByLabel(/aluno/i);
    if (await studentSelect.isVisible()) {
      await studentSelect.selectOption({ index: 0 });
    }

    await page.getByRole('button', { name: /confirmar|reservar/i }).click();

    // Confirma que o agendamento aparece em "Meus agendamentos"
    await page.getByRole('tab', { name: /meus agendamentos/i }).click();
    await expect(page.getByText(/confirmado/i).first()).toBeVisible();
  });

  test('responsável cancela próprio agendamento', async ({ page }) => {
    await loginAsGuardian(page);
    await page.goto('/guardian/appointments');

    await page.getByRole('tab', { name: /meus agendamentos/i }).click();

    const bookings = page.locator('[data-testid="booking-card"], .booking-card');
    const count = await bookings.count();

    if (count === 0) {
      test.skip();
      return;
    }

    await bookings.first().getByRole('button', { name: /cancelar/i }).click();
    await page.getByRole('button', { name: /confirmar cancelamento|sim/i }).click();

    await expect(page.getByText(/cancelado/i).first()).toBeVisible();
  });
});
