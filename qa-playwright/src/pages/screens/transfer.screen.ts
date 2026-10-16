import { BasePage } from '../base.page';

export class TransferScreen extends BasePage {
  private readonly account = () => this.locator('#account');
  private readonly amount = () => this.locator('#amount');
  private readonly confirm = () => this.locator('[data-testid=confirm]');

  async transfer(account: string, amount: string): Promise<void> {
    await this.account().fill(account);
    await this.amount().fill(amount);
    await this.confirm().click();
  }
}
