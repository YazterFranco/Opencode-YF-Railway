# qa-playwright

Plataforma de automatizacion QA con **Playwright (TypeScript)** para **Web + API + Mobile WebView (CDP / BrowserStack)**.

## Requisitos

- Node.js >= 18 y pnpm 9
- (Mobile local) `adb` con un dispositivo autorizado y WebView debugging habilitado
- (Mobile remoto) Cuenta de BrowserStack App Automate

## Instalacion

```bash
pnpm install
pnpm exec playwright install --with-deps
cp .env.example .env   # completa tus secretos localmente (no se versiona)
```

## Estructura

```
config/browserstack/   capabilities de App Automate
data/environments/     configuracion por entorno (json)
data/schemas/          JSON Schema de validacion
data/datasets/         datos para pruebas data-driven
src/config/            carga de entorno y secretos
src/api/               cliente de API (request context)
src/mobile/            conexion al webview via CDP (local/browserstack/appium)
src/pages/             Page Object Model
src/fixtures/          fixtures que inyectan page/webview/api
tests/                 suites web / api / mobile
scripts/               utilidades (validacion de entorno)
```

## Comandos

```bash
make lint          # eslint + tsc + prettier + validacion de entorno
make web           # tests web
make api           # tests api
make mobile        # tests mobile (webview)
make smoke         # solo @smoke
make test          # todo
make report        # abre el reporte HTML
```

## Entornos

Se seleccionan con `ENV` (`dev|qa|staging|prod`). La configuracion vive en
`data/environments/<env>.json` y los secretos en variables de entorno
(`API_TOKEN`, `WEB_USER`, `WEB_PASS`, `BROWSERSTACK_USER`, `BROWSERSTACK_KEY`).

## Mobile WebView (CDP)

`src/mobile/webview.ts` abstrae la conexion CDP en 3 modos via `WEBVIEW_MODE`:

| Modo | Descripcion | Variable requerida |
|------|-------------|--------------------|
| `local` | adb forward + `connectOverCDP` | dispositivo con `adb` |
| `browserstack` | CDP entregado por App Automate | `BS_CDP_URL` |
| `appium` | CDP expuesto por Appium | `WEBVIEW_CDP_URL` |

## CI

- `bitbucket-pipelines.yml` (nativo)
- `Jenkinsfile`
- `.circleci/config.yml`

Todos ejecutan **lint** y luego las suites **web/api/mobile en paralelo**.

## Buenas practicas

- Cero `waitForTimeout` (regla ESLint `playwright/no-wait-for-timeout`).
- POM sin selectores en los tests (usar `data-testid`).
- Datos externalizados; secretos solo en el CI.
- Aislamiento de tests y trazas/videos solo en fallos.
