import { BasePage } from '../base.page';

export class DashboardScreen extends BasePage {
  private readonly balance = () => this.locator('[data-testid=balance]');

  async getBalance(): Promise<string> {
    await this.visible(this.balance());
    return (await this.balance().textContent())?.trim() ?? '';
  }
}
