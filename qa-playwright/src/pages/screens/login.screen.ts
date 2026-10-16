import { BasePage } from '../base.page';

export class LoginScreen extends BasePage {
  private readonly user = () => this.locator('#username');
  private readonly pass = () => this.locator('#password');
  private readonly submit = () => this.locator('button[type=submit]');

  async login(u: string, p: string): Promise<void> {
    await this.user().fill(u);
    await this.pass().fill(p);
    await this.submit().click();
  }

  async expectDashboard(): Promise<void> {
    await this.visible(this.locator('[data-testid=dashboard]'));
  }
}
