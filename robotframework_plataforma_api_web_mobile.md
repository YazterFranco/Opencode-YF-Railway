# Plataforma QA con Robot Framework — API + Web + Mobile (BrowserStack)

> Propuesta completa, orientada a **un solo framework: Robot Framework (RF)**.
> Incluye **todos los archivos necesarios** para integrar a un pipeline con linters y buenas prácticas.
> Dominios cubiertos: **API**, **Web** y **App móvil nativa** (iOS/Android) vía **BrowserStack App Automate**.

---

## 0. Por qué Robot Framework (y no otro)

| Necesidad | Robot Framework | Playwright | Karate |
|-----------|-----------------|------------|--------|
| API REST | ✅ RequestsLibrary | ✅ | ✅ |
| Web (UI) | ✅ SeleniumLibrary / Browser(Playwright) | ✅ | ⚠️ |
| **App móvil nativa** | ✅ **AppiumLibrary + BrowserStack** | ❌ | ❌ |
| Un solo lenguaje para los 3 dominios | ✅ | ❌ | ❌ |
| Keyword-driven (equipo mixto) | ✅ | ⚠️ | ❌ |
| Reporting nativo (log.html) | ✅ | ✅ | ✅ |

**Conclusión:** RF es el único que cubre los **tres dominios** con un solo skill set y un reporting unificado. Es la elección correcta para API + Web + Mobile.

---

## 1. Estructura del proyecto

```
qa-robotframework/
├── config/
│   ├── browsers/
│   │   └── browserstack_caps.json      # Capabilities por dispositivo/OS
│   └── robot.yaml                      # Entry point de ejecución
├── data/
│   ├── environments/
│   │   ├── dev.json
│   │   ├── qa.json
│   │   ├── staging.json
│   │   └── prod.json
│   ├── datasets/
│   │   ├── api_users.csv
│   │   └── web_checkout.json
│   └── schemas/
│       └── environment.schema.json
├── libraries/
│   ├── EnvLoader.py                    # Carga de entorno + secretos
│   ├── ApiClient.py                    # Helper HTTP (opcional, sobre Requests)
│   └── MobileHelper.py                 # Helper BrowserStack/Appium
├── resources/
│   ├── common/
│   │   ├── setup_teardown.resource
│   │   ├── assertions.resource
│   │   └── logging.resource
│   ├── keywords/
│   │   ├── api_keywords.resource
│   │   ├── web_keywords.resource
│   │   └── mobile_keywords.resource
│   └── variables/
│       ├── global_variables.resource
│       └── secrets.resource            # NUNCA versionar valores reales
├── tests/
│   ├── api/
│   │   ├── smoke/
│   │   └── regression/
│   ├── web/
│   │   ├── smoke/
│   │   └── regression/
│   └── mobile/
│       ├── smoke/
│       └── regression/
├── reports/                            # salida (gitignored)
├── scripts/
│   ├── run-api.sh
│   ├── run-web.sh
│   ├── run-mobile.sh
│   ├── run-all-parallel.sh
│   └── validate-env.py
├── .pre-commit-config.yaml
├── .robocop.toml                       # Linter principal RF
├── ruff.toml                           # Linter Python (libraries)
├── mypy.ini
├── pyproject.toml
├── requirements.txt
├── Makefile
├── bitbucket-pipelines.yml
├── Jenkinsfile
├── .circleci/config.yml
├── .gitignore
└── README.md
```

---

## 2. Configuración base

### 2.1 `requirements.txt`
```text
# Core
robotframework==7.1
robotframework-requests==0.9.7
robotframework-seleniumlibrary==6.6.1
robotframework-appiumlibrary==2.0.0
robotframework-browser==18.0.0
robotframework-faker==5.0.0

# Ejecución y paralelismo
robotframework-pabot==2.18.0
robotframework-retryfailed==0.2.0

# Datos y utilidades
pyyaml==6.0.2
jsonschema==4.23.0
python-dotenv==1.0.1

# Calidad
robocop==5.0.0
ruff==0.6.0
mypy==1.11.0
```

### 2.2 `pyproject.toml`
```toml
[project]
name = "qa-robotframework"
version = "1.0.0"
requires-python = ">=3.11"
dependencies = { file = "requirements.txt" }

[tool.robot]
pythonpath = ["libraries", "resources"]
```

### 2.3 `config/robot.yaml`
```yaml
tasks:
  api:
    shell: python -m robot --outputdir reports/api --include api tests/api
  web:
    shell: python -m robot --outputdir reports/web --include web tests/web
  mobile:
    shell: python -m robot --outputdir reports/mobile --include mobile tests/mobile
  all:
    shell: python -m pabot --processes 4 --outputdir reports/all tests
```

### 2.4 `data/environments/qa.json`
```json
{
  "webBaseUrl": "https://qa.example.com",
  "apiBaseUrl": "https://api.qa.example.com",
  "browserstack": {
    "user": "BROWSERSTACK_USER",
    "key": "BROWSERSTACK_KEY",
    "app": "bs://<app-id-qa>",
    "project": "QA-Mobile",
    "build": "qa-${BUILD_ID}"
  },
  "timeout": 15000
}
```

### 2.5 `libraries/EnvLoader.py`
```python
"""Carga variables de entorno y resuelve secretos.

No contiene secretos: los toma de variables de entorno del runner/CI.
"""
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def load_environment(env: str = "qa") -> dict:
    env = env or os.getenv("ENV", "qa")
    path = ROOT / "data" / "environments" / f"{env}.json"
    if not path.exists():
        raise FileNotFoundError(f"Environment file not found: {path}")

    with path.open(encoding="utf-8") as fh:
        data = json.load(fh)

    # Resolver secretos desde variables de entorno (nunca desde el JSON)
    def resolve(value):
        if isinstance(value, dict):
            return {k: resolve(v) for k, v in value.items()}
        if isinstance(value, str) and value.isupper():
            return os.getenv(value, value)
        return value

    return resolve(data)


def get(key: str, env: str = "qa"):
    data = load_environment(env)
    for part in key.split("."):
        data = data[part]
    return data
```

### 2.6 `resources/variables/global_variables.resource`
```robotframework
*** Settings ***
Library    EnvLoader.py
Library    Collections

*** Variables ***
${ENV}            %{ENV=qa}
${TIMEOUT}        ${15s}
${RETRY}          3x

*** Keywords ***
Cargar Configuracion
    ${cfg}=    Load Environment    ${ENV}
    Set Suite Variable    ${CONFIG}    ${cfg}
    Set Suite Variable    ${WEB_URL}   ${cfg}[webBaseUrl]
    Set Suite Variable    ${API_URL}   ${cfg}[apiBaseUrl]
    Log    Entorno cargado: ${ENV}    console=True
```

### 2.7 `resources/variables/secrets.resource`
```robotframework
*** Variables ***
# NO versionar valores reales. Se resuelven desde variables de entorno del CI.
# Ejemplos de nombres esperados por EnvLoader:
#   BROWSERSTACK_USER, BROWSERSTACK_KEY
#   API_TOKEN, WEB_USER, WEB_PASS
${API_TOKEN}      %{API_TOKEN=${EMPTY}}
${WEB_USER}       %{WEB_USER=${EMPTY}}
${WEB_PASS}       %{WEB_PASS=${EMPTY}}
```

### 2.8 `data/schemas/environment.schema.json`
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["webBaseUrl", "apiBaseUrl", "browserstack", "timeout"],
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
        "project": { "type": "string" },
        "build": { "type": "string" }
      }
    }
  },
  "additionalProperties": true
}
```

---

## 3. Keywords compartidos

### 3.1 `resources/common/setup_teardown.resource`
```robotframework
*** Settings ***
Resource    ../variables/global_variables.resource
Library     DateTime

*** Keywords ***
Suite Setup Global
    Cargar Configuracion
    Log    Inicio de suite: ${SUITE NAME}    console=True

Suite Teardown Global
    Log    Fin de suite: ${SUITE NAME}    console=True

Test Setup Comun
    Log    Test: ${TEST NAME}    console=True

Test Teardown Comun
    Run Keyword If Test Failed    Tomar Evidencia De Fallo

Tomar Evidencia De Fallo
    Capture Page Screenshot
```

### 3.2 `resources/common/assertions.resource`
```robotframework
*** Keywords ***
Validar Codigo HTTP
    [Arguments]    ${response}    ${expected}
    Should Be Equal As Integers    ${response.status_code}    ${expected}

Validar Elemento Visible
    [Arguments]    ${locator}
    Wait Until Element Is Visible    ${locator}    timeout=${TIMEOUT}
```

### 3.3 `resources/common/logging.resource`
```robotframework
*** Keywords ***
Log Con Contexto
    [Arguments]    ${message}    ${level}=INFO
    Log    [${ENV}] ${message}    level=${level}
```

---

## 4. Dominio API

### 4.1 `resources/keywords/api_keywords.resource`
```robotframework
*** Settings ***
Library     RequestsLibrary
Library     Collections
Resource    ../variables/global_variables.resource

*** Keywords ***
Crear Sesion API
    [Arguments]    ${alias}=api
    ${headers}=    Create Dictionary    Content-Type=application/json
    ...    Authorization=Bearer ${API_TOKEN}
    Create Session    ${alias}    ${API_URL}    headers=${headers}    timeout=30

GET Con Reintentos
    [Arguments]    ${path}    ${expected}=200
    ${resp}=    GET On Session    api    ${path}
    Validar Codigo HTTP    ${resp}    ${expected}
    RETURN    ${resp}

OBTENER JSON
    [Arguments]    ${response}
    ${json}=    Set Variable    ${response.json()}
    RETURN    ${json}
```

### 4.2 `tests/api/smoke/health.robot`
```robotframework
*** Settings ***
Documentation     Smoke API - health y disponibilidad.
Resource          ../../../resources/keywords/api_keywords.resource
Resource          ../../../resources/common/assertions.resource
Suite Setup       Crear Sesion API
Force Tags        api    smoke

*** Test Cases ***
API Responde Saludablemente
    [Tags]    critical
    ${resp}=    GET Con Reintentos    /health
    Should Be Equal As Strings    ${resp.json()}[status]    ok

Listado De Usuarios Devuelve 200
    ${resp}=    GET Con Reintentos    /v1/users
    ${json}=    OBTENER JSON    ${resp}
    Should Not Be Empty    ${json}
```

---

## 5. Dominio Web

### 5.1 `resources/keywords/web_keywords.resource`
```robotframework
*** Settings ***
Library     SeleniumLibrary    timeout=${TIMEOUT}
Resource    ../variables/global_variables.resource

*** Keywords ***
Abrir Navegador Web
    [Arguments]    ${browser}=chrome
    Open Browser    ${WEB_URL}    ${browser}
    Maximize Browser Window
    Set Selenium Speed    0s
    Set Selenium Timeout    ${TIMEOUT}

Iniciar Sesion Web
    [Arguments]    ${user}=${WEB_USER}    ${pass}=${WEB_PASS}
    Input Text        css=#username    ${user}
    Input Password    css=#password    ${pass}
    Click Button      css=button[type=submit]
    Wait Until Location Contains    dashboard    timeout=${TIMEOUT}

Cerrar Navegador Web
    Close All Browsers
```

### 5.2 `tests/web/smoke/login.robot`
```robotframework
*** Settings ***
Documentation     Smoke Web - login.
Resource          ../../../resources/keywords/web_keywords.resource
Resource          ../../../resources/common/setup_teardown.resource
Suite Setup       Abrir Navegador Web
Suite Teardown    Cerrar Navegador Web
Test Setup        Test Setup Comun
Force Tags        web    smoke

*** Test Cases ***
Login Exitoso
    [Tags]    critical
    Iniciar Sesion Web
    Wait Until Element Is Visible    css=[data-testid=dashboard]    timeout=${TIMEOUT}
    Element Should Be Visible         css=[data-testid=balance]
```

---

## 6. Dominio Mobile (BrowserStack App Automate)

### 6.1 `config/browsers/browserstack_caps.json`
```json
{
  "android": {
    "platformName": "android",
    "appium:platformVersion": "13.0",
    "appium:deviceName": "Samsung Galaxy S23",
    "appium:app": "__APP__",
    "appium:automationName": "UiAutomator2",
    "appium:autoGrantPermissions": true,
    "bstack:options": {
      "projectName": "__PROJECT__",
      "buildName": "__BUILD__",
      "sessionName": "__SESSION__",
      "debug": true,
      "networkLogs": true
    }
  },
  "ios": {
    "platformName": "ios",
    "appium:platformVersion": "16",
    "appium:deviceName": "iPhone 14",
    "appium:app": "__APP__",
    "appium:automationName": "XCUITest",
    "bstack:options": {
      "projectName": "__PROJECT__",
      "buildName": "__BUILD__",
      "sessionName": "__SESSION__",
      "debug": true,
      "networkLogs": true
    }
  }
}
```

### 6.2 `libraries/MobileHelper.py`
```python
"""Construye las capabilities de BrowserStack desde JSON + entorno."""
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def build_capabilities(platform: str = "android", session_name: str = "test") -> dict:
    caps_path = ROOT / "config" / "browsers" / "browserstack_caps.json"
    with caps_path.open(encoding="utf-8") as fh:
        caps = json.load(fh)[platform]

    app = os.getenv("BS_APP", "")
    project = os.getenv("BS_PROJECT", "QA-Mobile")
    build = os.getenv("BS_BUILD", "local")

    def substitute(value):
        if isinstance(value, dict):
            return {k: substitute(v) for k, v in value.items()}
        if isinstance(value, str):
            return (value.replace("__APP__", app)
                         .replace("__PROJECT__", project)
                         .replace("__BUILD__", build)
                         .replace("__SESSION__", session_name))
        return value

    resolved = substitute(caps)
    resolved["bstack:options"]["userName"] = os.getenv("BROWSERSTACK_USER", "")
    resolved["bstack:options"]["accessKey"] = os.getenv("BROWSERSTACK_KEY", "")
    return resolved
```

### 6.3 `resources/keywords/mobile_keywords.resource`
```robotframework
*** Settings ***
Library     AppiumLibrary    timeout=${TIMEOUT}
Library     MobileHelper.py
Resource    ../variables/global_variables.resource

*** Keywords ***
Abrir App En BrowserStack
    [Arguments]    ${platform}=android    ${session}=${TEST NAME}
    ${caps}=    Build Capabilities    ${platform}    ${session}
    Open Application    http://hub-cloud.browserstack.com/wd/hub
    ...    &{caps}

Cerrar App
    Close Application

Login En App
    [Arguments]    ${user}=${WEB_USER}    ${pass}=${WEB_PASS}
    Wait Until Element Is Visible    accessibility_id=username    timeout=${TIMEOUT}
    Input Text        accessibility_id=username    ${user}
    Input Text        accessibility_id=password    ${pass}
    Click Element     accessibility_id=login
```

### 6.4 `tests/mobile/smoke/login_mobile.robot`
```robotframework
*** Settings ***
Documentation     Smoke Mobile - login Android en BrowserStack.
Resource          ../../../resources/keywords/mobile_keywords.resource
Resource          ../../../resources/common/setup_teardown.resource
Suite Setup       Run Keywords    Cargar Configuracion    Abrir App En BrowserStack
Suite Teardown    Cerrar App
Force Tags        mobile    smoke

*** Test Cases ***
Login Exitoso En Android
    [Tags]    critical
    Login En App
    Wait Until Element Is Visible    accessibility_id=dashboard    timeout=${TIMEOUT}
```
> Para iOS: duplicar el test con `Abrir App En BrowserStack    ios`.

---

## 7. Data externalizada

- **Entornos** en `data/environments/*.json` (config + referencias a secretos).
- **Datasets** en `data/datasets/` (CSV/JSON) para data-driven.
- **Secretos** solo desde variables de entorno del runner: `BROWSERSTACK_USER`, `BROWSERSTACK_KEY`, `API_TOKEN`, `WEB_USER`, `WEB_PASS`.

### Data-driven con Templates
```robotframework
*** Settings ***
Library    DataDriver    file=../data/datasets/api_users.csv    dialect=excel
Test Template    Crear Usuario API

*** Test Cases ***
Crear Usuario Con Datos ${name}
    [Tags]    api    regression

*** Keywords ***
Crear Usuario API
    [Arguments]    ${name}    ${email}    ${expected}
    ${body}=    Create Dictionary    name=${name}    email=${email}
    ${resp}=    POST On Session    api    /v1/users    json=${body}
    Validar Codigo HTTP    ${resp}    ${expected}
```

### `scripts/validate-env.py`
```python
import glob, json, sys
from jsonschema import validate

schema = json.load(open("data/schemas/environment.schema.json"))
errors = 0
for env_file in glob.glob("data/environments/*.json"):
    try:
        validate(json.load(open(env_file)), schema)
        print(f"OK   {env_file}")
    except Exception as exc:
        errors += 1
        print(f"FAIL {env_file}: {exc}")
sys.exit(1 if errors else 0)
```

---

## 8. Linters (sistema completo)

| Artefacto | Herramienta | Config |
|-----------|-------------|--------|
| `.robot`, `.resource` | **Robocop** | `.robocop.toml` |
| `.py` (libraries) | **Ruff** | `ruff.toml` |
| `.py` tipado | **mypy** | `mypy.ini` |
| JSON/YAML | JSON Schema + Prettier | schema + `.prettierrc` |

### 8.1 `.robocop.toml`
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

### 8.2 `ruff.toml`
```toml
line-length = 120
target-version = "py311"

[lint]
select = ["E", "F", "W", "I", "N", "UP", "B", "SIM", "S"]

[format]
quote-style = "double"
```

### 8.3 `mypy.ini`
```ini
[mypy]
python_version = 3.11
strict = True
warn_unused_ignores = True
exclude = '(^|/)(\.venv|build|dist)/'
```

### 8.4 `.pre-commit-config.yaml`
```yaml
repos:
  - repo: https://github.com/robotframework/robocop
    rev: v5.0.0
    hooks: [{ id: robocop }]
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.6.0
    hooks: [{ id: ruff }, { id: ruff-format }]
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.11.0
    hooks: [{ id: mypy }]
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks: [{ id: check-json }, { id: check-yaml }, { id: end-of-file-fixer }]
```

### 8.5 `Makefile`
```makefile
.PHONY: lint api web mobile all
lint:
	robocop tests resources
	ruff check libraries && ruff format --check libraries
	mypy libraries
	python scripts/validate-env.py
api:
	python -m robot --outputdir reports/api --include api tests/api
web:
	python -m robot --outputdir reports/web --include web tests/web
mobile:
	python -m robot --outputdir reports/mobile --include mobile tests/mobile
all:
	python -m pabot --processes 4 --outputdir reports/all tests
```

---

## 9. Pipelines

### 9.1 Bitbucket Pipelines (nativo) — `bitbucket-pipelines.yml`
```yaml
image: python:3.11

definitions:
  caches:
    pip: ~/.cache/pip
  steps:
    - step: &lint
        name: Lint (Robocop + Ruff + mypy + env schema)
        caches: [pip]
        script:
          - pip install -r requirements.txt
          - robocop tests resources
          - ruff check libraries
          - mypy libraries
          - python scripts/validate-env.py
    - step: &test-api
        name: API tests
        caches: [pip]
        script:
          - pip install -r requirements.txt
          - ENV=qa python -m robot --outputdir reports/api --include api tests/api
        artifacts: [reports/**]
    - step: &test-web
        name: Web tests
        caches: [pip]
        script:
          - pip install -r requirements.txt
          - ENV=qa python -m robot --outputdir reports/web --include web tests/web
        artifacts: [reports/**]
    - step: &test-mobile
        name: Mobile tests (BrowserStack)
        caches: [pip]
        script:
          - pip install -r requirements.txt
          - ENV=qa python -m robot --outputdir reports/mobile --include mobile tests/mobile
        artifacts: [reports/**]

pipelines:
  default:
    - step: *lint
    - parallel:
        - step: *test-api
        - step: *test-web
        - step: *test-mobile
  pull-requests:
    '**':
      - step: *lint
      - parallel:
          - step: *test-api
          - step: *test-web
```
> Variables seguras (`BROWSERSTACK_USER`, `BROWSERSTACK_KEY`, `API_TOKEN`, `WEB_USER`, `WEB_PASS`) se definen en **Repository settings → Pipelines → Variables** (secured).

### 9.2 Jenkins — `Jenkinsfile`
```groovy
pipeline {
  agent { docker { image 'python:3.11' } }
  environment { ENV = 'qa' }
  options { timeout(time: 60, unit: 'MINUTES'); timestamps() }
  stages {
    stage('Install') { steps { sh 'pip install -r requirements.txt' } }
    stage('Lint') {
      parallel {
        stage('Robocop') { steps { sh 'robocop tests resources' } }
        stage('Ruff')    { steps { sh 'ruff check libraries && mypy libraries' } }
        stage('EnvSchema'){ steps { sh 'python scripts/validate-env.py' } }
      }
    }
    stage('Tests') {
      parallel {
        stage('API')    { steps { sh 'python -m robot --outputdir reports/api --include api tests/api' } }
        stage('Web')    { steps { sh 'python -m robot --outputdir reports/web --include web tests/web' } }
        stage('Mobile') { steps { sh 'python -m robot --outputdir reports/mobile --include mobile tests/mobile' } }
      }
    }
  }
  post {
    always {
      junit 'reports/**/output.xml'
      archiveArtifacts artifacts: 'reports/**', allowEmptyArchive: true
    }
  }
}
```

### 9.3 CircleCI — `.circleci/config.yml`
```yaml
version: 2.1

jobs:
  lint:
    docker: [{ image: cimg/python:3.11 }]
    steps:
      - checkout
      - run: pip install -r requirements.txt
      - run: robocop tests resources
      - run: ruff check libraries && mypy libraries
      - run: python scripts/validate-env.py
  test:
    docker: [{ image: cimg/python:3.11 }]
    parameters:
      domain: { type: string }
    steps:
      - checkout
      - run: pip install -r requirements.txt
      - run: ENV=qa python -m robot --outputdir reports/<< parameters.domain >> --include << parameters.domain >> tests/<< parameters.domain >>
      - store_artifacts: { path: reports }

workflows:
  quality:
    jobs:
      - lint
      - test: { name: test-api,    domain: api,    requires: [lint] }
      - test: { name: test-web,    domain: web,    requires: [lint] }
      - test: { name: test-mobile, domain: mobile, requires: [lint] }
```

---

## 10. Ejecución y paralelismo

```bash
# Local
make lint
make api
make web
make mobile
make all                     # pabot paralelo

# Solo smoke
python -m robot --include smoke --outputdir reports tests

# Reintentar solo fallidos
python -m robot --rerunfailed reports/all/output.xml --output reports/all/rerun.xml tests
```

`scripts/run-all-parallel.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail
python -m pabot \
  --processes 4 \
  --outputdir reports/all \
  --include smoke,regression \
  tests
```

---

## 11. Buenas prácticas (anti-flaky y calidad)

1. **Sin `Sleep`**: usar `Wait Until Element Is Visible/Clickable` con `timeout`.
2. **Tags consistentes**: `api`, `web`, `mobile`, `smoke`, `regression`, `critical`.
3. **Tests independientes**: setup/teardown crean y limpian su propio estado.
4. **Datos externalizados**: nunca hardcodear credenciales ni URLs.
5. **Selectores estables**: `data-testid`/`accessibility_id`, no XPath frágil.
6. **BrowserStack**: `debug=true` y `networkLogs=true` en fallos; subir app por `bs://`.
7. **Retry controlado**: `robotframework-retryfailed` solo para fallos de red/UI conocidos.
8. **Evidencia**: screenshot automático en teardown fallido.
9. **Aislamiento por entorno**: `ENV=qa|staging|prod` sin cambiar código.
10. **Quality gates**: lint y schema son **bloqueantes** en CI.

---

## 12. Checklist de integración

- [ ] Estructura `config/ data/ libraries/ resources/ tests/ scripts/`
- [ ] `EnvLoader.py` resuelve entorno y secretos
- [ ] `data/environments/*.json` válidos contra schema
- [ ] Keywords separados por dominio (api/web/mobile)
- [ ] Tests smoke + regression con tags
- [ ] BrowserStack capabilities en `config/browsers/`
- [ ] Robocop + Ruff + mypy + pre-commit funcionando (`make lint`)
- [ ] Pipeline Bitbucket (+ Jenkins/CircleCI) con lint → tests paralelos
- [ ] Secretos en variables seguras del CI (nunca en el repo)
- [ ] Reportes (`log.html`, `output.xml`) publicados por ejecución
- [ ] Métricas: pass rate, flaky, duración por dominio

---

*Documento v1.0 — Robot Framework como plataforma única para API + Web + Mobile (BrowserStack).*
