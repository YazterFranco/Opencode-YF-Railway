# Opencode-YF-Railway

Repositorio de plataforma de automatización QA/QE: documentación, informes y scaffolds ejecutables.

## Informes y comparativas

- **[Informe interactivo de selección de framework (HTML)](./framework_selection_qe.html)** — comparativa multi-criterio de 8 frameworks (API/Web/App), gráficos de barras, radar, heatmap y roadmap QA→QE. Ábrelo en el navegador.
  - Assets exportables: [`assets/`](./assets/) (SVG estáticos generados).

## Documentación

- [Buenas prácticas QA Senior](./buenas_practicas_qa_senior.md)
- [Arquitectura monorepo QA integral](./arquitectura_monorepo_qa_integral.md)
- [Robot Framework — API + Web + Mobile (BrowserStack)](./robotframework_plataforma_api_web_mobile.md)
- [Playwright — API + Web + Mobile WebView (CDP/BrowserStack)](./playwright_plataforma_api_web_mobile_webview.md)

## Scaffold ejecutable

- [`qa-playwright/`](./qa-playwright/) — proyecto Playwright (TypeScript) con POM, fixtures, linters y pipelines (Bitbucket/Jenkins/CircleCI) para Web + API + Mobile WebView.

```bash
cd qa-playwright
pnpm install
pnpm exec playwright install --with-deps
cp .env.example .env
make validate && make lint && make api
```

## Resumen de la recomendación

| Escenario | Framework ideal |
|-----------|-----------------|
| API + Web + **App nativa** en un solo runner | **WebdriverIO** (o **Robot Framework**) |
| API + Web + **webview**, foco QE | **Playwright** (+ Appium para nativo puntual) |

> Detalle y puntuaciones en el [informe interactivo](./framework_selection_qe.html).
