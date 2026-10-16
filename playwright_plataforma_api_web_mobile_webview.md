# Plataforma QA con Playwright — Web + API + Mobile WebView (CDP / BrowserStack)

> Propuesta completa orientada a **un solo framework: Playwright (TypeScript)**.
> Cubre **Web**, **API** y **móvil híbrido (webview)** mediante **Chrome DevTools Protocol (CDP)**, en dispositivo local y en **BrowserStack**.
> Incluye **todos los archivos necesarios**: config, POM, fixtures, linters y pipelines (Bitbucket / Jenkins / CircleCI).

---

## 0. Por qué Playwright para este caso

| Necesidad | Cómo lo cubre Playwright |
|-----------|--------------------------|
| Web (UI) | ✅ Motor nativo (Chromium/WebKit/Firefox) con auto-wait |
| API REST | ✅ `request` context integrado |
| Móvil webview (híbrida) | ✅ `chromium.connectOverCDP()` sobre el webview (keystore Chromium) |
| Dispositivo real + BrowserStack | ✅ CDP y sesiones remotas |
| Un solo lenguaje (TS) | ✅ Todo el stack |
| Reporting | ✅ HTML report, traces, videos, screenshots |

> Playwright no controla componentes **nativos** (botones nativos, cámara nativa). Si el flujo es 100% webview (contenido web dentro de la app), Playwright es suficiente. Para nativo puro se requeriría Appium aparte.

---

## 1. Estructura del proyecto

```
qa-playwright/
├── config/
│   └── browserstack/
│       └── webview.caps.json        # caps App Automate (para lanzar el webview)
├── data/
│   ├── environments/
│   │   ├── dev.json
│   │   ├── qa.json
│   │   ├── staging.json
│   │   └── prod.json
│   ├── datasets/
│   │   ├── api_users.json
│   │   └── web_checkout.json
│   └── schemas/
│       └── environment.schema.json
├── src/
│   ├── config/
│   │   └── env.ts                   # carga de entorno + secretos
│   ├── api/
│   │   └── api-client.ts            # wrapper del request context
│   ├── mobile/
│   │   ├── webview.ts               # conexión CDP (local/BS/Appium)
│   │   └── adb.ts                   # port-forward + descubrir socket
│   ├── pages/                       # POM
│   │   ├── base.page.ts
│   │   ├── components/
│   │   │   ├── navbar.component.ts
│   │   │   └── data-table.component.ts
│   │   └── screens/
│   │       ├── login.screen.ts
│   │       ├── dashboard.screen.ts
│   │       └── transfer.screen.ts
│   ├── fixtures/
│   │   └── base.fixture.ts          # inyecta page/webview/api
│   └── support/
│       └── performance.ts
├── tests/
│   ├── web/
│   │   ├── smoke/
│   │   └── regression/
│   ├── api/
│   │   ├── smoke/
│   │   └── regression/
│   └── mobile/
│       ├── smoke/
│       └── regression/
├── scripts/
│   ├── validate-env.ts              # valida environments contra schema
│   ├── run-web.sh
│   ├── run-api.sh
│   ├── run-mobile.sh
│   └── run-all.sh
├── .env.example
├── .eslintrc / eslint.config.mjs
├── .prettierrc
├── biome.json                       # (opcional, alternativa a ESLint+Prettier)
├── tsconfig.json
├── playwright.config.ts
├── package.json
├── pnpm-workspace.yaml              # (opcional si es monorepo)
├── Makefile
├── bitbucket-pipelines.yml
├── Jenkinsfile
├── .circleci/config.yml
├── .gitignore
└── README.md
```

---

## 2. Configuración base

### 2.1 `package.json`
```json
{
  "name": "qa-playwright",
  "version": "1.0.0",
  "private": true,
  "engines": { "node": ">=18.0.0" },
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "lint": "eslint . && tsc --noEmit && prettier --check .",
    "lint:fix": "eslint . --fix && prettier --write .",
    "validate:env": "tsx scripts/validate-env.ts",
    "test": "playwright test",
    "test:web": "playwright test tests/web",
    "test:api": "playwright test tests/api",
    "test:mobile": "playwright test tests/mobile",
    "test:smoke": "playwright test --grep @smoke",
    "test:parallel": "playwright test --workers=4",
    "report": "playwright show-report"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.0",
    "@types/node": "^22.0.0",
    "ajv": "^8.17.0",
    "ajv-formats": "^3.0.0",
    "dotenv": "^16.4.0",
    "eslint": "^9.0.0",
    "eslint-plugin-playwright": "^2.0.0",
    "prettier": "^3.3.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "typescript-eslint": "^8.0.0"
  },
  "dependencies": {
    "undici": "^6.20.0"
  }
}
```

### 2.2 `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@pages/*": ["src/pages/*"],
      "@config/*": ["src/config/*"],
      "@fixtures/*": ["src/fixtures/*"],
      "@api/*": ["src/api/*"],
      "@mobile/*": ["src/mobile/*"]
    }
  },
  "include": ["src", "tests", "scripts", "playwright.config.ts"]
}
```

### 2.3 `playwright.config.ts`
```ts
import { defineConfig, devices } from '@playwright/test';
import { loadEnv } from './src/config/env';

const env = loadEnv();

export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : undefined,
  forbidOnly: !!process.env.CI,
  reporter: [
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['json', { outputFile: 'reports/results.json' }],
    ['list'],
  ],
  use: {
    baseURL: env.webBaseUrl,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: env.timeout,
    extraHTTPHeaders: { 'Accept-Language': 'es' },
  },
  projects: [
    { name: 'web-chromium', testDir: './tests/web', use: { ...devices['Desktop Chrome'] } },
    { name: 'web-firefox', testDir: './tests/web', use: { ...devices['Desktop Firefox'] } },
    { name: 'api', testDir: './tests/api', use: { baseURL: env.apiBaseUrl } },
    { name: 'mobile-webview', testDir: './tests/mobile' }, // usa CDP (ver §6)
  ],
  outputDir: 'reports/artifacts',
});
```

### 2.4 `.env.example`
```dotenv
# Entorno activo
ENV=qa

# Secretos (NO versionar valores reales; se inyectan en CI)
API_TOKEN=
WEB_USER=
WEB_PASS=

# BrowserStack
BROWSERSTACK_USER=
BROWSERSTACK_KEY=
BS_APP=bs://<app-id>
BS_PROJECT=QA-Mobile
BS_BUILD=local

# Webview / CDP
# Modo: local (adb) | browserstack | appium
WEBVIEW_MODE=local
WEBVIEW_CDP_URL=http://127.0.0.1:9222
```

### 2.5 `.gitignore`
```
node_modules/
reports/
.env
.env.*
!.env.example
playwright-report/
test-results/
*.log
```

---

## 3. Data externalizada + validación de schema

### 3.1 `data/environments/qa.json`
```json
{
  "webBaseUrl": "https://qa.example.com",
  "apiBaseUrl": "https://api.qa.example.com",
  "timeout": 15000,
  "browserstack": {
    "user": "BROWSERSTACK_USER",
    "key": "BROWSERSTACK_KEY",
    "app": "bs://<app-id-qa>",
    "project": "QA-Mobile"
  }
}
```
> Los valores en MAYÚSCULAS son **nombres de variables de entorno**; el loader los resuelve en runtime.

### 3.2 `data/schemas/environment.schema.json`
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["webBaseUrl", "apiBaseUrl", "timeout", "browserstack"],
  "properties": {
    "webBaseUrl": { "type": "string", "format": "uri" },
    "apiBaseUrl": { "type": "string", "format": "uri" },
    "timeout": { "type": "integer", "minimum": 1000 },
    "browserstack": {
      "type": "object",
      "required": ["user", "key", "app", "project"],
      "properties": {
        "user": { "type": "string" },
        "key": { "type": "string" },
        "app": { "type": "string" },
        "project": { "type": "string" }
      }
    }
  },
  "additionalProperties": true
}
```

### 3.3 `src/config/env.ts`
```ts
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

export interface EnvConfig {
  webBaseUrl: string;
  apiBaseUrl: string;
  timeout: number;
  browserstack: { user: string; key: string; app: string; project: string };
}

const ROOT = process.cwd();

function resolve(value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolve(v)]));
  }
  if (typeof value === 'string' && value === value.toUpperCase() && value.length > 1) {
    return process.env[value] ?? value;
  }
  return value;
}

export function loadEnv(env = process.env.ENV ?? 'qa'): EnvConfig {
  const file = path.join(ROOT, 'data', 'environments', `${env}.json`);
  if (!fs.existsSync(file)) throw new Error(`Environment not found: ${file}`);
  return resolve(JSON.parse(fs.readFileSync(file, 'utf8'))) as EnvConfig;
}
```

### 3.4 `scripts/validate-env.ts`
```ts
import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const schema = JSON.parse(fs.readFileSync('data/schemas/environment.schema.json', 'utf8'));
const ajv = addFormats(new Ajv({ allErrors: true }));
const validate = ajv.compile(schema);

const dir = path.join('data', 'environments');
let failed = 0;
for (const f of fs.readdirSync(dir)) {
  const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  if (validate(data)) console.log(`OK   ${f}`);
  else { failed++; console.error(`FAIL ${f}`, validate.errors); }
}
process.exit(failed ? 1 : 0);
```

---

## 4. Page Object Model (POM)

### 4.1 `src/pages/base.page.ts`
```ts
import { Page, Locator, expect } from '@playwright/test';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(path = '/'): Promise<void> {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
  }

  protected locator(selector: string): Locator {
    return this.page.locator(selector);
  }

  protected async visible(locator: Locator): Promise<void> {
    await expect(locator).toBeVisible();
  }
}
```

### 4.2 `src/pages/screens/login.screen.ts`
```ts
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
```

### 4.3 `src/pages/screens/dashboard.screen.ts`
```ts
import { BasePage } from '../base.page';

export class DashboardScreen extends BasePage {
  private readonly balance = () => this.locator('[data-testid=balance]');

  async getBalance(): Promise<string> {
    await this.visible(this.balance());
    return (await this.balance().textContent())?.trim() ?? '';
  }
}
```

### 4.4 `src/pages/screens/transfer.screen.ts`
```ts
import { BasePage } from '../base.page';

export class TransferScreen extends BasePage {
  private readonly amount = () => this.locator('#amount');
  private readonly account = () => this.locator('#account');
  private readonly confirm = () => this.locator('[data-testid=confirm]');

  async transfer(account: string, amount: string): Promise<void> {
    await this.account().fill(account);
    await this.amount().fill(amount);
    await this.confirm().click();
  }
}
```

---

## 5. API con el request context

### 5.1 `src/api/api-client.ts`
```ts
import { APIRequestContext, APIResponse, request } from '@playwright/test';
import { loadEnv } from '../config/env';

export class ApiClient {
  private constructor(private readonly ctx: APIRequestContext) {}

  static async create(): Promise<ApiClient> {
    const env = loadEnv();
    const ctx = await request.newContext({
      baseURL: env.apiBaseUrl,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.API_TOKEN ?? ''}`,
      },
      timeout: env.timeout,
    });
    return new ApiClient(ctx);
  }

  async get(path: string): Promise<APIResponse> {
    return this.ctx.get(path);
  }

  async post(path: string, data: unknown): Promise<APIResponse> {
    return this.ctx.post(path, { data });
  }

  async dispose(): Promise<void> {
    await this.ctx.dispose();
  }
}
```

### 5.2 `tests/api/smoke/health.spec.ts`
```ts
import { test, expect } from '@playwright/test';
import { ApiClient } from '@api/api-client';

let api: ApiClient;
test.beforeAll(async () => { api = await ApiClient.create(); });
test.afterAll(async () => { await api.dispose(); });

test.describe('API smoke @smoke @api', () => {
  test('health responde ok', async () => {
    const res = await api.get('/health');
    expect(res.status()).toBe(200);
    expect((await res.json()).status).toBe('ok');
  });

  test('listado de usuarios devuelve 200 @critical', async () => {
    const res = await api.get('/v1/users');
    expect(res.status()).toBe(200);
    expect(await res.json()).not.toHaveLength(0);
  });
});
```

---

## 6. Mobile WebView vía CDP (3 modos)

### 6.1 `src/mobile/adb.ts` (modo local)
```ts
import { execSync } from 'node:child_process';

/** Habilita y reenvía el socket devtools del webview al host. */
export function forwardWebviewDevtools(port = 9222): string {
  const sockets = execSync('adb shell cat /proc/net/unix').toString();
  const match = sockets.match(/@?(webview_devtools_remote.*)/);
  if (!match) throw new Error('No webview devtools socket found. ¿WebView debugging habilitado?');
  const socket = match[1].trim();
  execSync(`adb forward tcp:${port} localabstract:${socket}`);
  return `http://127.0.0.1:${port}`;
}
```

### 6.2 `src/mobile/webview.ts`
```ts
import { Browser, chromium } from '@playwright/test';
import { forwardWebviewDevtools } from './adb';

export type WebviewMode = 'local' | 'browserstack' | 'appium';

export interface WebviewSession {
  browser: Browser;
  close: () => Promise<void>;
}

/**
 * Conecta Playwright al webview vía CDP.
 * - local:        adb forward + connectOverCDP
 * - browserstack: usa el CDP URL entregado por App Automate (env BS_CDP_URL)
 * - appium:       usa el CDP URL expuesto por Appium (env WEBVIEW_CDP_URL)
 */
export async function connectWebview(mode = (process.env.WEBVIEW_MODE as WebviewMode) ?? 'local'): Promise<WebviewSession> {
  let cdpUrl = process.env.WEBVIEW_CDP_URL ?? 'http://127.0.0.1:9222';

  if (mode === 'local') {
    cdpUrl = forwardWebviewDevtools();
  }
  if (mode === 'browserstack') {
    if (!process.env.BS_CDP_URL) throw new Error('BS_CDP_URL no definido (lo entrega la sesión de App Automate)');
    cdpUrl = process.env.BS_CDP_URL;
  }
  if (mode === 'appium') {
    if (!process.env.WEBVIEW_CDP_URL) throw new Error('WEBVIEW_CDP_URL no definido por Appium');
    cdpUrl = process.env.WEBVIEW_CDP_URL;
  }

  const browser = await chromium.connectOverCDP(cdpUrl);
  return {
    browser,
    close: async () => { await browser.close(); },
  };
}
```

### 6.3 `src/fixtures/base.fixture.ts`
```ts
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
```

### 6.4 `config/browserstack/webview.caps.json`
```json
{
  "android": {
    "platformName": "android",
    "appium:platformVersion": "13.0",
    "appium:deviceName": "Samsung Galaxy S23",
    "appium:app": "__APP__",
    "appium:automationName": "UiAutomator2",
    "appium:autoWebview": true,
    "appium:chromedriverExecutableDir": "/appium/chromedriver",
    "bstack:options": {
      "projectName": "__PROJECT__",
      "buildName": "__BUILD__",
      "debug": true,
      "networkLogs": true
    }
  }
}
```
> `autoWebview: true` hace que Appium aterrice directamente en el contexto webview. Desde ahí, obtén el **CDP URL** de la sesión y pásalo a `WEBVIEW_CDP_URL`/`BS_CDP_URL` para que Playwright lo controle.

### 6.5 `tests/mobile/smoke/login.spec.ts`
```ts
import { test, expect } from '@fixtures/base.fixture';
import { LoginScreen } from '@pages/screens/login.screen';
import { DashboardScreen } from '@pages/screens/dashboard.screen';

test.describe('Mobile webview smoke @smoke @mobile', () => {
  test('login exitoso en webview', async ({ webview }) => {
    const login = new LoginScreen(webview.page);
    await login.login(process.env.WEB_USER!, process.env.WEB_PASS!);
    await login.expectDashboard();

    const dash = new DashboardScreen(webview.page);
    expect(await dash.getBalance()).toMatch(/\d/);
  });
});
```

---

## 7. Linters (sistema completo)

| Artefacto | Herramienta | Config |
|-----------|-------------|--------|
| `.ts`, `.js` | **ESLint** + `eslint-plugin-playwright` | `eslint.config.mjs` |
| Formato | **Prettier** (o **Biome**) | `.prettierrc` / `biome.json` |
| Tipos | **tsc --noEmit** | `tsconfig.json` |
| JSON / YAML | **JSON Schema** + Prettier | `scripts/validate-env.ts` |

### 7.1 `eslint.config.mjs` (flat config)
```js
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';

export default [
  { ignores: ['reports/**', 'node_modules/**', 'playwright-report/**'] },
  ...tseslint.configs.recommended,
  {
    files: ['tests/**/*.ts', 'src/**/*.ts'],
    plugins: { playwright },
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-wait-for-timeout': 'error',     // prohíbe sleeps → anti-flaky
      'playwright/no-force-option': 'warn',
      'playwright/no-skipped-test': 'warn',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'warn',
    },
  },
];
```

### 7.2 `.prettierrc`
```json
{ "semi": true, "singleQuote": true, "printWidth": 120, "trailingComma": "all", "arrowParens": "always" }
```

### 7.3 `biome.json` (alternativa todo-en-uno a ESLint+Prettier, opcional)
```json
{
  "$schema": "https://biomejs.com/schemas/1.9.0",
  "files": { "ignore": ["reports/**", "node_modules/**"] },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true, "suspicious": { "noConsole": "warn" } }
  },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2, "lineWidth": 120 }
}
```

### 7.4 `Makefile`
```makefile
.PHONY: install lint lint-fix test web api mobile smoke report validate
install:    ; pnpm install --frozen-lockfile && pnpm exec playwright install --with-deps
lint:       ; pnpm run lint && pnpm run validate:env
lint-fix:   ; pnpm run lint:fix
validate:   ; pnpm run validate:env
web:        ; pnpm test:web
api:        ; pnpm test:api
mobile:     ; pnpm test:mobile
smoke:      ; pnpm test:smoke
test:       ; pnpm test
report:     ; pnpm exec playwright show-report reports/html
```

### 7.5 `.pre-commit-config.yaml`
```yaml
repos:
  - repo: local
    hooks:
      - id: eslint
        name: eslint
        entry: pnpm exec eslint --fix
        language: system
        types: [ts]
      - id: prettier
        name: prettier
        entry: pnpm exec prettier --write
        language: system
      - id: tsc
        name: tsc
        entry: pnpm exec tsc --noEmit
        language: system
        pass_filenames: false
```

---

## 8. Pipelines

### 8.1 Bitbucket Pipelines (nativo) — `bitbucket-pipelines.yml`
```yaml
image: mcr.microsoft.com/playwright:v1.48.0-jammy

definitions:
  caches:
    pnpm: ~/.local/share/pnpm/store
  steps:
    - step: &lint
        name: Lint (eslint + prettier + tsc + env schema)
        caches: [pnpm]
        script:
          - corepack enable
          - pnpm install --frozen-lockfile
          - pnpm run validate:env
          - pnpm exec eslint .
          - pnpm exec prettier --check .
          - pnpm exec tsc --noEmit
    - step: &test-web
        name: Web tests
        caches: [pnpm]
        script:
          - corepack enable && pnpm install --frozen-lockfile
          - ENV=qa pnpm test:web
        artifacts: [reports/**]
    - step: &test-api
        name: API tests
        caches: [pnpm]
        script:
          - corepack enable && pnpm install --frozen-lockfile
          - ENV=qa pnpm test:api
        artifacts: [reports/**]
    - step: &test-mobile
        name: Mobile webview (BrowserStack)
        caches: [pnpm]
        script:
          - corepack enable && pnpm install --frozen-lockfile
          - ENV=qa WEBVIEW_MODE=browserstack pnpm test:mobile
        artifacts: [reports/**]

pipelines:
  default:
    - step: *lint
    - parallel:
        - step: *test-web
        - step: *test-api
        - step: *test-mobile
  pull-requests:
    '**':
      - step: *lint
      - parallel:
          - step: *test-web
          - step: *test-api
```
> Definir `BROWSERSTACK_USER`, `BROWSERSTACK_KEY`, `API_TOKEN`, `WEB_USER`, `WEB_PASS`, `BS_CDP_URL` como **secured variables** en Bitbucket.

### 8.2 Jenkins — `Jenkinsfile`
```groovy
pipeline {
  agent { docker { image 'mcr.microsoft.com/playwright:v1.48.0-jammy' } }
  environment { ENV = 'qa' }
  options { timeout(time: 60, unit: 'MINUTES'); timestamps() }
  stages {
    stage('Install') { steps { sh 'corepack enable && pnpm install --frozen-lockfile' } }
    stage('Lint') {
      parallel {
        stage('ESLint')   { steps { sh 'pnpm exec eslint .' } }
        stage('Prettier') { steps { sh 'pnpm exec prettier --check .' } }
        stage('Types')    { steps { sh 'pnpm exec tsc --noEmit' } }
        stage('Env')      { steps { sh 'pnpm run validate:env' } }
      }
    }
    stage('Tests') {
      parallel {
        stage('Web')    { steps { sh 'pnpm test:web' } }
        stage('API')    { steps { sh 'pnpm test:api' } }
        stage('Mobile') { steps { sh 'WEBVIEW_MODE=browserstack pnpm test:mobile' } }
      }
    }
  }
  post {
    always {
      junit 'reports/results.json'
      publishHTML([reportDir: 'reports/html', reportFiles: 'index.html', reportName: 'Playwright Report'])
      archiveArtifacts artifacts: 'reports/**', allowEmptyArchive: true
    }
  }
}
```

### 8.3 CircleCI — `.circleci/config.yml`
```yaml
version: 2.1

jobs:
  lint:
    docker: [{ image: mcr.microsoft.com/playwright:v1.48.0-jammy }]
    steps:
      - checkout
      - run: corepack enable && pnpm install --frozen-lockfile
      - run: pnpm run validate:env
      - run: pnpm exec eslint . && pnpm exec tsc --noEmit
  test:
    docker: [{ image: mcr.microsoft.com/playwright:v1.48.0-jammy }]
    parameters:
      suite: { type: string }
      mode: { type: string, default: '' }
    steps:
      - checkout
      - run: corepack enable && pnpm install --frozen-lockfile
      - run: ENV=qa WEBVIEW_MODE=<< parameters.mode >> pnpm test:<< parameters.suite >>
      - store_artifacts: { path: reports }

workflows:
  quality:
    jobs:
      - lint
      - test: { name: test-web,    suite: web,    requires: [lint] }
      - test: { name: test-api,    suite: api,    requires: [lint] }
      - test: { name: test-mobile, suite: mobile, mode: browserstack, requires: [lint] }
```

---

## 9. Ejecución

```bash
# Local web + api
ENV=qa pnpm test:web
ENV=qa pnpm test:api

# Mobile webview: modo local (adb)
adb devices
ENV=qa WEBVIEW_MODE=local pnpm test:mobile

# Mobile webview: BrowserStack
ENV=qa WEBVIEW_MODE=browserstack pnpm test:mobile

# Todo en paralelo
ENV=qa pnpm test:parallel

# Solo smoke
pnpm test:smoke
```

`scripts/run-all.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail
ENV=${ENV:-qa}
pnpm run validate:env
pnpm exec playwright test --workers=4
```

---

## 10. Buenas prácticas (anti-flaky)

1. **Cero `waitForTimeout`** → regla ESLint `playwright/no-wait-for-timeout: error`.
2. **Auto-wait de Playwright** + `expect(...).toBeVisible()` con timeout.
3. **POM sin selectores en tests**; usar `data-testid`.
4. **Tags** `@smoke @regression @web @api @mobile @critical` para filtrado.
5. **Datos externalizados**; secretos solo en CI.
6. **Aislamiento**: cada test crea su estado; `storageState` por rol.
7. **Traces + video + screenshot solo en fallos** para diagnóstico.
8. **Retries solo en CI** (`retries: 1`) y nunca para enmascarar bugs.
9. **Webview**: `autoWebview` + esperar el contexto WEBVIEW antes de conectar CDP.
10. **Quality gates** bloqueantes: lint, tsc, env schema.

---

## 11. Checklist de integración

- [ ] Estructura `config/ data/ src/ tests/ scripts/`
- [ ] `env.ts` carga entornos y resuelve secretos
- [ ] `data/environments/*.json` validan contra schema (`validate:env`)
- [ ] POM en `src/pages` (base, componentes, screens)
- [ ] API vía `src/api/api-client.ts`
- [ ] Webview vía `src/mobile/webview.ts` (local / browserstack / appium)
- [ ] Fixtures inyectan `page`/`webview`/`api`
- [ ] ESLint + `eslint-plugin-playwright` + Prettier + tsc pasando
- [ ] Pipeline Bitbucket (+ Jenkins/CircleCI) lint → tests paralelos
- [ ] Secretos y `BS_CDP_URL` como variables seguras en CI
- [ ] Reportes HTML + JSON como artefactos por ejecución
- [ ] Métricas: pass rate, flaky, duración por suite

---

*Documento v1.0 — Playwright como plataforma única para Web + API + Mobile WebView (CDP / BrowserStack).*
