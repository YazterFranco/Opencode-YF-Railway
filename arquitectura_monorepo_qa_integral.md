# Propuesta de Alto Nivel — Arquitectura Monorepo QA

> Documento complementario a `buenas_practicas_qa_senior.md`.
> Cubre: **sistema de linters completo**, **monorepo**, **POM**, **pipelines (Jenkins / CircleCI / Bitbucket)** y **gestión de paquetes**.
> Autor: QA Senior — Plataforma de Automatización

---

## 0. Resumen Ejecutivo

Esta propuesta define una plataforma de automatización **multi-framework** (Robot Framework, Playwright, Karate) organizada como **monorepo**, con:

- **Un sistema de linters completo** por lenguaje (no solo Robocop).
- **POM desacoplado** reutilizable entre frameworks.
- **Pipelines portables** (Bitbucket Pipelines nativo + Jenkins y CircleCI como alternativas).
- **Gestión centralizada de paquetes** (Python, Node, Java/Karate) con versiones bloqueadas.
- **Data externalizada** por entorno y métricas de calidad continuas.

Principio rector: **el repo es la fuente de verdad del QA**; todo (tests, datos, linters, pipelines) vive versionado y reproducible.

---

## 1. ¿Por qué Monorepo y no Multi-repo?

| Criterio | Monorepo | Multi-repo |
|----------|----------|------------|
| Consistencia de linters/datos | ✅ Una sola config | ❌ Se desincroniza |
| Reutilización de POM/utilidades | ✅ Compartido | ❌ Copia/pega |
| Pipeline unificado | ✅ Un orquestador | ❌ N pipelines |
| Versionado de contratos API | ✅ Atómico | ❌ Desfasado |
| Escalado de equipos | ⚠️ Requiere convención | ✅ Natural |

**Veredicto:** monorepo para el **core de QA compartido** (POM, utils, datos, config de linter/CI), y permite que dominios grandes tengan su carpeta propia. Se recomienda monorepo mientras el equipo QA < 30 personas.

---

## 2. Estructura del Monorepo

```
qa-monorepo/
├── .bitbucket/                     # (vacío o scripts de hooks)
├── .circleci/
│   └── config.yml                  # Pipeline CircleCI
├── .github/                        # (opcional, si se usa GH además de Bitbucket)
│   └── workflows/
├── jenkins/
│   ├── Jenkinsfile                 # Pipeline Jenkins declarativo
│   └── shared-library/             # Jenkins Shared Library
├── config/
│   ├── linters/                    # Configs de linter centralizadas
│   │   ├── ruff.toml
│   │   ├── .flake8
│   │   ├── mypy.ini
│   │   ├── .robocop.toml
│   │   ├── eslint.config.mjs
│   │   ├── biome.json
│   │   └── .prettierrc
│   ├── tests/                      # Configs de frameworks
│   │   ├── playwright.config.ts
│   │   ├── karate-config.js
│   │   └── robot.yaml
│   └── ci/                         # Configs compartidas de pipeline
│       └── quality-gates.yaml
├── data/                           # DATA EXTERNA (fuente de verdad)
│   ├── environments/
│   │   ├── dev.json
│   │   ├── qa.json
│   │   ├── staging.json
│   │   └── prod.json
│   ├── datasets/
│   │   ├── usuarios.csv
│   │   └── escenarios.json
│   └── schemas/                    # JSON Schema para validar la data
│       └── environment.schema.json
├── packages/                       # Paquetes internos reutilizables
│   ├── core-utils/                 # helpers, logger, config loader
│   │   ├── src/
│   │   ├── package.json
│   │   └── pyproject.toml
│   ├── page-objects/               # POM compartido (web)
│   │   ├── src/
│   │   │   ├── base-page.ts
│   │   │   ├── components/
│   │   │   └── screens/
│   │   └── package.json
│   └── api-clients/                # Clientes API compartidos
│       ├── src/
│       └── package.json
├── suites/                         # Suites por framework/dominio
│   ├── robot/
│   │   ├── tests/
│   │   │   ├── smoke/
│   │   │   ├── regression/
│   │   │   └── api/
│   │   ├── resources/
│   │   │   ├── keywords/
│   │   │   └── variables/
│   │   └── requirements.txt
│   ├── playwright/
│   │   ├── tests/
│   │   │   ├── e2e/
│   │   │   ├── visual/
│   │   │   └── api/
│   │   ├── fixtures/
│   │   └── package.json
│   └── karate/
│       ├── src/test/java/
│       │   └── features/
│       │       ├── smoke/
│       │       └── regression/
│       └── pom.xml
├── reports/                        # (gitignored) salida de ejecuciones
├── scripts/                        # automatizaciones del monorepo
│   ├── bootstrap.sh
│   ├── lint-all.sh
│   ├── test-all.sh
│   ├── generate-data.py
│   ├── validate-env-schema.py
│   └── check-flaky.py
├── Makefile                        # interfaz única de comandos
├── package.json                    # workspaces (npm)
├── pnpm-workspace.yaml             # (si se usa pnpm)
├── pyproject.toml                  # proyecto Python raíz
├── .editorconfig
├── .gitignore
├── .pre-commit-config.yaml
└── README.md
```

### Convenciones de carpetas
- `config/` → configuración *transversal* (linters, CI, frameworks).
- `packages/` → código *reutilizable* entre suites.
- `suites/` → casos de prueba por framework.
- `data/` → **nunca** contiene lógica; solo datos versionados y validados por schema.

---

## 3. Sistema de Linters COMPLETO (multi-lenguaje)

El linter no es un solo tool: es una **cadena de calidad** por lenguaje, orquestada por pre-commit + CI.

### 3.1 Matriz de herramientas

| Lenguaje / Artefacto | Formatter | Linter | Type checker | Reglas de dominio |
|----------------------|-----------|--------|--------------|-------------------|
| **Robot Framework** | Robocop (`format`) | **Robocop** | — | Robocop rules, `robotidy` |
| **Python** | Ruff format / Black | **Ruff** + flake8 | **mypy** | bandit (seguridad), pydocstyle |
| **TypeScript / JavaScript** | Prettier / Biome | **ESLint** + Biome | **tsc --noEmit** | `eslint-plugin-playwright` |
| **Karate / Java** | google-java-format | **Checkstyle** + SpotBugs | — | PMD |
| **JSON / YAML** | Prettier | JSON Schema validation | — | schema (`ajv`, `check-jsonschema`) |
| **Shell** | shfmt | **shellcheck** | — | — |
| **Markdown** | Prettier | markdownlint | — | — |
| **Docker** | — | hadolint | — | — |
| **Commits** | commitlint | commitlint | — | Conventional Commits |

> **Clave:** no se pide "usar 3 linters" por framework. Se pide **una cadena por lenguaje**, y el monorepo ejecuta cada cadena solo sobre los archivos que correspondan.

### 3.2 Mapa de decisión: ¿qué linter aplica a qué?

```
¿Qué archivo toco?
├── *.robot, *.resource, *.feature(RF) ─► Robocop
├── *.py, pyproject.toml             ─► Ruff + mypy (+ bandit)
├── *.ts, *.js, package.json         ─► ESLint/Biome + tsc + Prettier
├── *.java, pom.xml (Karate)         ─► Checkstyle + SpotBugs + google-java-format
├── *.json, *.yaml (data/config)     ─► JSON Schema + Prettier
└── *.sh                             ─► shellcheck + shfmt
```

### 3.3 Configuraciones centralizadas

#### Robocop (`.robocop.toml`)
```toml
[core]
severity = "warning"
quality_gates = true

[reports]
output_format = "json"
output = "reports/lint/robocop.json"

[tool.robocop.lint]
select = ["DOC", "LEN", "NAME", "ORD", "SPC"]
ignore = ["DOC01", "LEN03"]
configure = [
  "line-too-long.line_length=120",
  "too-many-arguments.max_args=8",
]
```

#### Ruff (`.ruff.toml`) — reemplaza flake8/isort/pyupgrade
```toml
line-length = 120
target-version = "py311"

[lint]
select = ["E", "F", "W", "I", "N", "UP", "B", "C4", "SIM", "S"]
ignore = ["E501"]
per-file-ignores = { "tests/**" = ["S101"] }

[format]
quote-style = "double"
```

#### mypy (`.mypy.ini`)
```ini
[mypy]
python_version = 3.11
strict = True
warn_unused_ignores = True
exclude = '(^|/)(\.venv|build|dist)/'
```

#### ESLint (`.eslint.config.mjs`) — flat config
```js
import playwright from 'eslint-plugin-playwright';
import tseslint from 'typescript-eslint';

export default [
  ...tseslint.configs.recommended,
  {
    files: ['suites/playwright/**/*.ts'],
    plugins: { playwright },
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-wait-for-timeout': 'error',   // anti-flaky
      'playwright/no-force-option': 'warn',
      'no-console': 'warn',
    },
  },
];
```

#### Prettier (`.prettierrc`)
```json
{ "semi": true, "singleQuote": true, "printWidth": 120, "trailingComma": "all" }
```

#### Checkstyle (Karate) — `config/checkstyle.xml`
```xml
<module name="Checker">
  <module name="LineLength"><property name="max" value="120"/></module>
  <module name="TreeWalker">
    <module name="UnusedImports"/>
    <module name="NeedBraces"/>
  </module>
</module>
```

### 3.4 Pre-commit (un solo punto de entrada local)

`.pre-commit-config.yaml`
```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.6.0
    hooks: [{ id: ruff }, { id: ruff-format }]
  - repo: https://github.com/robotframework/robocop
    rev: v5.0.0
    hooks: [{ id: robocop }]
  - repo: https://github.com/pre-commit/mirrors-eslint
    rev: v9.0.0
    hooks: [{ id: eslint, additional_dependencies: ['typescript-eslint', 'eslint-plugin-playwright'] }]
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.11.0
    hooks: [{ id: mypy }]
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: check-json
      - id: check-yaml
      - id: end-of-file-fixer
      - id: trailing-whitespace
  - repo: https://github.com/koalaman/shellcheck-precommit
    rev: v0.10.0
    hooks: [{ id: shellcheck }]
```

### 3.5 Ejecución unificada

`Makefile`
```makefile
lint:        ## Lint de todo el monorepo
	@./scripts/lint-all.sh

lint-rf:     ## Solo Robot Framework
	robocop suites/robot
lint-py:
	ruff check && mypy .
lint-ts:
	pnpm -C suites/playwright exec eslint . && pnpm exec tsc --noEmit
lint-java:
	mvn -f suites/karate checkstyle:check spotbugs:check
```

`scripts/lint-all.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail
rc=0
robocop suites/robot           || rc=1
ruff check . && mypy .          || rc=1
pnpm exec eslint suites/playwright || rc=1
mvn -q -f suites/karate checkstyle:check || rc=1
shellcheck scripts/*.sh         || rc=1
exit $rc
```

### 3.6 Quality Gates (bloqueantes en CI)
```
✅ 0 errores de linter (severity >= error)
✅ mypy strict sin errores
✅ tsc --noEmit sin errores
✅ Cobertura >= 80% en suites críticas
✅ 0 tests flaky en últimas N ejecuciones
✅ data/environments valida contra schema
```

---

## 4. Page Object Model (POM) Completo

### 4.1 Principios
1. **Los tests no contienen selectores.** Solo intención de negocio.
2. **POM en `packages/page-objects`** → reutilizable por Playwright y RF.
3. **BasePage** centraliza esperas implícitas (anti-flaky).
4. **Componentes** reutilizables (Header, Modal, Table).
5. **Sin lógica de negocio** en el POM: solo interacción UI.

### 4.2 Estructura
```
packages/page-objects/src/
├── base-page.ts
├── components/
│   ├── navbar.component.ts
│   ├── modal.component.ts
│   └── data-table.component.ts
├── screens/
│   ├── login.screen.ts
│   ├── dashboard.screen.ts
│   └── transfer.screen.ts
└── index.ts
```

### 4.3 Implementación (TypeScript / Playwright)
```ts
// base-page.ts
import { Page, Locator, expect } from '@playwright/test';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(path = '/'): Promise<void> {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
  }

  protected locator(selector: string): Locator {
    return this.page.locator(selector);
  }

  async expectVisible(locator: Locator): Promise<void> {
    await expect(locator).toBeVisible({ timeout: 5000 });
  }
}
```

```ts
// login.screen.ts
import { BasePage } from '../base-page';

export class LoginScreen extends BasePage {
  private readonly userInput = () => this.locator('#username');
  private readonly passInput = () => this.locator('#password');
  private readonly submitBtn = () => this.locator('button[type=submit]');

  async login(user: string, pass: string): Promise<void> {
    await this.userInput().fill(user);
    await this.passInput().fill(pass);
    await this.submitBtn().click();
  }

  async expectDashboard(): Promise<void> {
    await this.expectVisible(this.locator('[data-testid="dashboard"]'));
  }
}
```

```ts
// dashboard.screen.ts
import { BasePage } from '../base-page';

export class DashboardScreen extends BasePage {
  private readonly balance = () => this.locator('[data-testid="balance"]');

  async getBalanceText(): Promise<string> {
    return (await this.balance().textContent()) ?? '';
  }
}
```

### 4.4 Consumo desde un test
```ts
// suites/playwright/tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test';
import { LoginScreen, DashboardScreen } from '@qa/page-objects';
import { loadEnv } from '@qa/core-utils';

const env = loadEnv(process.env.ENV ?? 'qa');

test('login exitoso', async ({ page }) => {
  const login = new LoginScreen(page);
  await login.goto(env.webBaseUrl);
  await login.login(env.user, env.pass);
  await login.expectDashboard();

  const dash = new DashboardScreen(page);
  await expect(await dash.getBalanceText()).toMatch(/\d/);
});
```

### 4.5 Puente POM → Robot Framework
Los keywords de RF deben **delegar** en el mismo contrato lógico. Opción A: reusar vía HTTP/CLI. Opción B: keywords paralelos con la misma nomenclatura.

```robotframework
*** Keywords ***
Login Con Credenciales
    [Arguments]    ${user}    ${pass}
    Login Screen.Open Login
    Login Screen.Enter Username    ${user}
    Login Screen.Enter Password    ${pass}
    Login Screen.Submit
    Login Screen.Verify Dashboard Visible
```

---

## 5. Gestión de Paquetes / Dependencias

### 5.1 Estrategia por ecosistema

| Ecosistema | Herramienta | Archivo de bloqueo | Estrategia |
|-----------|-------------|--------------------|------------|
| Python | **uv** (recomendado) o pip-tools | `uv.lock` | lock estricto + `requirements.txt` piñado |
| Node | **pnpm** workspaces | `pnpm-lock.yaml` | workspaces + lock con `--frozen-lockfile` |
| Java (Karate) | Maven/Gradle | `pom.xml` / `gradle.lockfile` | versiones fijas, `-Dmaven.repo.local` cacheado |

### 5.2 Python (uv + pyproject)
`pyproject.toml`
```toml
[project]
name = "qa-core"
requires-python = ">=3.11"
dependencies = [
  "robotframework==7.1",
  "robotframework-requests==0.9.7",
  "robotframework-seleniumlibrary==6.6.1",
  "pyyaml==6.0.2",
]
[dependency-groups]
dev = ["robocop==5.0.0", "ruff==0.6.0", "mypy==1.11.0", "pytest==8.3.0"]
```
```bash
uv sync --frozen          # instalación reproducible
uv lock --upgrade         # actualizar deps de forma controlada
```

### 5.3 Node (pnpm workspaces)
`pnpm-workspace.yaml`
```yaml
packages:
  - 'packages/*'
  - 'suites/playwright'
```
```bash
pnpm install --frozen-lockfile
pnpm -r run lint
```

### 5.4 Versionado y release interno
- Paquetes internos versionados con **changesets** (`@qa/page-objects`, `@qa/core-utils`).
- Conventional Commits + `commitlint`.
- Tags `pkg/page-objects@1.2.0`.

### 5.5 Gestión de artefactos (reportes y binarios)
- Reportes → **Bitbucket Downloads** o S3/MinIO.
- Cachés de CI → **Bitbucket caches** / Jenkins `~/.m2`, `~/.cache/uv`, `pnpm store`.

---

## 6. Pipelines (portables)

> El repo vive en **Bitbucket**, por lo que el pipeline nativo es Bitbucket Pipelines. Se entregan además variantes para Jenkins y CircleCI.

### 6.1 Bitbucket Pipelines (nativo) — `bitbucket-pipelines.yml`
```yaml
image: atlassian/default-image:4

definitions:
  caches:
    pnpm: ~/.local/share/pnpm/store
    uv: ~/.cache/uv
    maven: ~/.m2
  steps:
    - step: &lint
        name: Lint (todos los lenguajes)
        image: python:3.11
        caches: [pnpm, uv]
        script:
          - curl -LsSf https://astral.sh/uv/install.sh | sh
          - export PATH="$HOME/.local/bin:$PATH"
          - uv sync --frozen
          - uv run robocop suites/robot
          - uv run ruff check .
          - uv run mypy .
          - corepack enable && pnpm install --frozen-lockfile
          - pnpm exec eslint suites/playwright
          - pnpm exec tsc --noEmit
    - step: &test
        name: Tests (RF + Playwright + Karate)
        image: python:3.11
        caches: [pnpm, uv, maven]
        script:
          - uv sync --frozen
          - pnpm install --frozen-lockfile
          - pnpm exec playwright install --with-deps chromium
          - ENV=qa uv run robot --outputdir reports/robot suites/robot
          - ENV=qa pnpm exec playwright test
          - mvn -q -f suites/karate test -Dkarate.env=qa
        artifacts:
          - reports/**

pipelines:
  default:
    - step: *lint
    - step: *test
  pull-requests:
    '**':
      - step: *lint
      - step: *test
  branches:
    main:
      - step: *lint
      - step: *test
      - step:
          name: Publicar reportes
          script:
            - echo "Publicar reportes en Downloads/S3"
```

### 6.2 Jenkins (declarativo) — `jenkins/Jenkinsfile`
```groovy
pipeline {
  agent any
  environment {
    ENV = 'qa'
  }
  options { timestamps(); ansiColor('xterm'); timeout(time: 45, unit: 'MINUTES') }
  stages {
    stage('Bootstrap') {
      steps {
        sh 'uv sync --frozen'
        sh 'corepack enable && pnpm install --frozen-lockfile'
      }
    }
    stage('Lint') {
      parallel {
        stage('RF')      { steps { sh 'uv run robocop suites/robot' } }
        stage('Python')  { steps { sh 'uv run ruff check . && uv run mypy .' } }
        stage('TS')      { steps { sh 'pnpm exec eslint suites/playwright && pnpm exec tsc --noEmit' } }
        stage('Karate')  { steps { sh 'mvn -q -f suites/karate checkstyle:check' } }
      }
    }
    stage('Test') {
      parallel {
        stage('Robot')      { steps { sh 'uv run robot --outputdir reports/robot suites/robot' } }
        stage('Playwright') { steps { sh 'pnpm exec playwright test' } }
        stage('Karate')     { steps { sh 'mvn -q -f suites/karate test -Dkarate.env=qa' } }
      }
    }
  }
  post {
    always {
      junit 'reports/**/*.xml'
      publishHTML([reportDir: 'reports', reportFiles: 'index.html', reportName: 'QA Report'])
      archiveArtifacts artifacts: 'reports/**', allowEmptyArchive: true
    }
    failure { echo 'Notificar al canal de QA' }
  }
}
```

### 6.3 CircleCI — `.circleci/config.yml`
```yaml
version: 2.1

orbs:
  node: circleci/node@5.2
  python: circleci/python@2.1

jobs:
  lint:
    docker: [{ image: cimg/python:3.11 }]
    steps:
      - checkout
      - python/install-packages: { pkg-manager: pip }
      - run: pip install uv && uv sync --frozen
      - run: uv run robocop suites/robot
      - run: uv run ruff check . && uv run mypy .
      - run: corepack enable && pnpm install --frozen-lockfile
      - run: pnpm exec eslint suites/playwright
  test:
    docker: [{ image: cimg/python:3.11 }]
    steps:
      - checkout
      - run: pip install uv && uv sync --frozen
      - run: pnpm install --frozen-lockfile && pnpm exec playwright install --with-deps chromium
      - run: ENV=qa uv run robot --outputdir reports/robot suites/robot
      - run: ENV=qa pnpm exec playwright test
      - store_artifacts: { path: reports }

workflows:
  quality:
    jobs:
      - lint
      - test:
          requires: [lint]
```

### 6.4 Reglas comunes de pipeline
- **Fail-fast**: lint antes de test.
- **Cachés** de `uv`, `pnpm`, `~/.m2` para acelerar.
- **Paralelización** por framework y por shard de tests.
- **Artefactos**: reportes HTML/XML siempre publicados.
- **Scope de ejecución**: cambiar sólo lo que corresponde (path filtering por framework).

---

## 7. Data externalizada + validación por schema

### 7.1 Estructura
```
data/environments/dev.json
data/schemas/environment.schema.json
```

### 7.2 Schema (JSON Schema)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["webBaseUrl", "apiBaseUrl", "user", "pass"],
  "properties": {
    "webBaseUrl": { "type": "string", "format": "uri" },
    "apiBaseUrl": { "type": "string", "format": "uri" },
    "user": { "type": "string" },
    "pass": { "type": "string", "minLength": 1 },
    "timeout": { "type": "integer", "minimum": 1000 }
  },
  "additionalProperties": false
}
```

### 7.3 Validación en CI (`scripts/validate-env-schema.py`)
```python
import json, sys, glob
from jsonschema import validate

schema = json.load(open('data/schemas/environment.schema.json'))
errors = 0
for f in glob.glob('data/environments/*.json'):
    try:
        validate(json.load(open(f)), schema)
        print(f'✅ {f}')
    except Exception as e:
        errors += 1
        print(f'❌ {f}: {e}')
sys.exit(1 if errors else 0)
```

### 7.4 Reglas de oro de la data
- Los secretos **no** van en JSON: van en variables de entorno / vault del CI.
- Cada `.json` de entorno **valida contra el schema** (gate de CI).
- Los datasets (CSV/JSON) son **de lectura**, versionados.
- Los fixtures se **crean y limpian** por el propio test.

---

## 8. Métricas y Observabilidad

| Métrica | Objetivo | Fuente |
|---------|----------|--------|
| Pass rate | ≥ 95% | Reportes de suites |
| Tiempo de suite | < 15 min | CI timing |
| Flaky rate | < 1% | Historial de ejecuciones |
| Cobertura | ≥ 80% (suites críticas) | coverage tools |
| Lint errors | 0 | Quality gates |
| MTTR de tests | < 1 día | Tracker |

`scripts/check-flaky.py`: compara las últimas N ejecuciones y marca tests cuyo resultado cambia con el mismo código.

---

## 9. Roadmap de adopción

```
Fase 0 (semana 0)   → Definir convenciones, crear esqueleto de monorepo
Fase 1 (semanas 1-2) → Linters + pre-commit + Makefile funcionando
Fase 2 (semanas 3-4) → POM base + 1 suite piloto (Playwright o RF)
Fase 3 (semanas 5-6) → Pipeline Bitbucket + reportes + data schema
Fase 4 (mes 2)       → Integrar 2º framework + métricas + quality gates
Fase 5 (mes 3+)      → Jenkins/CircleCI portables, flaky detection, escalado
```

---

## 10. Checklist de plataforma

- [ ] Monorepo con `config/`, `packages/`, `suites/`, `data/`
- [ ] Linter por lenguaje configurado y centralizado en `config/linters/`
- [ ] pre-commit + `scripts/lint-all.sh` + `make lint`
- [ ] Quality gates bloqueantes en CI
- [ ] POM en `packages/page-objects` consumido por suites
- [ ] `data/environments/*.json` valida contra schema
- [ ] Pipeline Bitbucket (y variantes Jenkins/CircleCI) operativo
- [ ] Gestión de paquetes con lock (uv, pnpm, maven)
- [ ] Reportes publicados como artefactos por ejecución
- [ ] Métricas de pass/flaky/coverage en dashboard
- [ ] Documentación README por suite + guía de contribución

---

*Documento de alto nivel — v1.0. Complementa a `buenas_practicas_qa_senior.md`.*
