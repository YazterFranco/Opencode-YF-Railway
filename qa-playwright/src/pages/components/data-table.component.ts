import { Page, Locator } from '@playwright/test';

export class DataTableComponent {
  constructor(private readonly page: Page, private readonly testId = 'data-table') {}

  get root(): Locator {
    return this.page.locator(`[data-testid=${this.testId}]`);
  }

  rows(): Locator {
    return this.root.locator('tbody tr');
  }

  async rowCount(): Promise<number> {
    return this.rows().count();
  }
}
