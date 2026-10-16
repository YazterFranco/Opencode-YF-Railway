import { test, expect } from '@fixtures/base.fixture';
import { LoginScreen } from '@pages/screens/login.screen';
import { DashboardScreen } from '@pages/screens/dashboard.screen';

test.describe('Mobile webview smoke - login @smoke @mobile', () => {
  test('login exitoso en webview @critical', async ({ webview }) => {
    const login = new LoginScreen(webview.page);
    await login.login(process.env.WEB_USER ?? '', process.env.WEB_PASS ?? '');
    await login.expectDashboard();

    const dash = new DashboardScreen(webview.page);
    expect(await dash.getBalance()).toMatch(/\d/);
  });
});
