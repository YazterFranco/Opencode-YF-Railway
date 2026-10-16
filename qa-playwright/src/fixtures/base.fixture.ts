import { test as base, Page } from '@playwright/test';
import { connectWebview, WebviewSession } from '@mobile/webview';
import { ApiClient } from '@api/api-client';

type Fixtures = {
  webview: { page: Page; session: WebviewSession };
  api: ApiClient;
};

export const test = base.extend<Fixtures>({
  webview: async ({}, use) => {
    const session = await connectWebview();
    const context = session.browser.contexts()[0];
    const page = context.pages()[0] ?? (await context.waitForEvent('page'));
    await use({ page, session });
    await session.close();
  },
  api: async ({}, use) => {
    const client = await ApiClient.create();
    await use(client);
    await client.dispose();
  },
});

export { expect } from '@playwright/test';
