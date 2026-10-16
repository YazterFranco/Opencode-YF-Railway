import { Page, Locator } from '@playwright/test';

export class NavbarComponent {
  constructor(private readonly page: Page) {}

  get root(): Locator {
    return this.page.locator('[data-testid=navbar]');
  }

  profileMenu(): Locator {
    return this.root.locator('[data-testid=profile]');
  }

  async openProfile(): Promise<void> {
    await this.profileMenu().click();
  }
}
