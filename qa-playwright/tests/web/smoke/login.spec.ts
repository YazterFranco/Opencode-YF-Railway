import { test, expect } from '@playwright/test';
import { LoginScreen } from '@pages/screens/login.screen';
import { DashboardScreen } from '@pages/screens/dashboard.screen';

test.describe('Web smoke - login @smoke @web', () => {
  test('login exitoso muestra dashboard @critical', async ({ page }) => {
    const login = new LoginScreen(page);
    await login.goto('/');
    await login.login(process.env.WEB_USER ?? '', process.env.WEB_PASS ?? '');
    await login.expectDashboard();

    const dash = new DashboardScreen(page);
    expect(await dash.getBalance()).toMatch(/\d/);
  });
});
