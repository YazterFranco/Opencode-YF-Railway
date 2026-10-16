import { Browser, chromium } from '@playwright/test';
import { forwardWebviewDevtools } from './adb';

export type WebviewMode = 'local' | 'browserstack' | 'appium';

export interface WebviewSession {
  browser: Browser;
  close: () => Promise<void>;
}

/**
 * Conecta Playwright al webview vía Chrome DevTools Protocol (CDP).
 *
 * - local:        adb forward + connectOverCDP
 * - browserstack: usa el CDP URL entregado por App Automate (env BS_CDP_URL)
 * - appium:       usa el CDP URL expuesto por Appium (env WEBVIEW_CDP_URL)
 */
export async function connectWebview(
  mode: WebviewMode = (process.env.WEBVIEW_MODE as WebviewMode) ?? 'local',
): Promise<WebviewSession> {
  let cdpUrl = process.env.WEBVIEW_CDP_URL ?? 'http://127.0.0.1:9222';

  if (mode === 'local') {
    cdpUrl = forwardWebviewDevtools();
  } else if (mode === 'browserstack') {
    if (!process.env.BS_CDP_URL) {
      throw new Error('BS_CDP_URL no definido (lo entrega la sesión de App Automate).');
    }
    cdpUrl = process.env.BS_CDP_URL;
  } else if (mode === 'appium') {
    if (!process.env.WEBVIEW_CDP_URL) {
      throw new Error('WEBVIEW_CDP_URL no definido por Appium.');
    }
    cdpUrl = process.env.WEBVIEW_CDP_URL;
  }

  const browser = await chromium.connectOverCDP(cdpUrl);
  return {
    browser,
    close: async () => {
      await browser.close();
    },
  };
}
