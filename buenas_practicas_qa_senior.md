# Buenas Prácticas de Implementación QA Senior

## 1. Validación de Licencias de Repositorios

Los repositorios principales validados y sus licencias:

| Repositorio | Licencia | Comentario |
|------------|----------|------------|
| `robotframework/robotframework` | Sin licencia detectada | Requerir validación explícita antes de uso |
| `MarketSquare/awesome-robotframework` | No verificado | Revisar manualmente |
| `adiralashiva8/robotframework-metrics` | Sin licencia | Evitar en producción |
| `adiralashiva8/robotframework-historic` | Sin licencia | Evitar en producción |
| `vncrtech/test-automation-101-rf` | Sin licencia | No clonarse (fallo de credenciales) |
| `San-aoun/Demo_API_AutomationTest_RobotFramwork` | Sin licencia | Revisar manualmente |
| `microsoft/playwright` | Apache 2.0 | ✅ Aprobado |
| `currents-dev/playwright-best-practices-skill` | Sin archivo detectado | Verificar |
| `microsoft/playwright-cli` | Pendiente de verificación | ⚠️ Revisar |
| `karatelabs/karate` | MIT | ✅ Aprobado |
| `coroboros/karate` | No verificado | Revisar |
| `mavericks-consulting/karatejs-test` | Sin licencia | Revisar |
| `manykarim/robotframework-agentskills` | Apache 2.0 | ✅ Aprobado |
| `manykarim/rf-mcp` | No encontrado | Reclonar |
| `microsoft/playwright-mcp` | Sin licencia | Revisar |
| `miltroj/result-companion` | No encontrado | Reclonar |
| `Sreenuraj/PostQodeCollections` | Sin licencia | Revisar |
| `microsoft/playwright-cli` | Pendiente | ⚠️ Revisar |

## 2. Arquitectura QA Senior para Pruebas Automatizadas

### Estructura de Carpetas por Entorno

```
tests/
  ├── features/           # Features por flujo o recurso
  │   ├── admin/
  │   │   └── login.feature
  │   ├── api/
  │   │   └── usuarios.feature
  │   └── reportes/
  │       └── reporte.feature
  ├── step_definitions/  # Implementación step by step
  │   ├── web/
  │   └── api/
  │
  ├── data/               # Datos de prueba EXTERNOS a la automatización
  │   ├── environments/
  │   │   ├── dev.json
  │   │   ├── qa.json
  │   │   └── prod.json
  │   └── datasets/
  │       ├── usuarios.csv
│       └── escenarios.xlsx
│
├── pages/                # POM (Page Object Model)
│   ├── components/
│   └── screens/
│
├── reports/              # Reportes generados por ejecución
│   ├── html/
│   ├── json/
│   └── logs/
│
└── support/
    ├── hooks.js
    ├── utils.js
    └── config.js
```

### Configuración por Entorno (Variables de Entorno)

**Nunca hardcodear datos en los tests.** Usar siempre variables de entorno o archivos JSON:

```bash
# .env file (nunca commitear)
API_BASE_URL=https://api.dev.example.com
API_TOKEN=dev_token_12345
BASE_URL=https://web.dev.example.com

# Uso en el test:
# process.env.API_BASE_URL  o  config.get('api.baseUrl')
```

### Selección de Pruebas y Tags

**Etiquetas (@tags) estratégicas:**

```
@smoke        - Tests críticos del flujo principal
@regression - Tests de funcionalidad completa
@api         - Tests de API exclusivamente
@visual    - Tests visuales/creenshots
@wip         - Work in progress (no ejecutar en CI)
```

### Calidad del Código y Linter

Selecciona el escenario que se ajusta a tu proyecto (no todos son necesarios):

---

#### 📦 Escenario 1: **Robot Framework Puro** (solo archivos .robot/.feature)
**Linter recomendado: **Robocop**  
_Revisa sintaxis RF, variables no usadas, argumentos de keywords, estructura de features_

Instalación:
```bash
pip install robocop
```

Configuración `.robocop.toml`:
```toml
[core]
# Nivel de severía: info, warning, error
severity = "warning"

# Habilitar/reglas deshabilitar
enable = "R0*,R2*"  # R0* = todas, R2* = reglas de sintaxis

# Reportes: stylish, html, json, table
report_style = "stylish"
```

Comando de ejecución:
```bash
# Revisar todo el proyecto
robocop .

# Revisar solo archivos modificados
robocop --dir tests/

# Reporte HTML
robocop --reporter html --output report.html
```

**Ejemplos de reglas que detecta:**
- `RF0001`: Variable `${X}` definida pero nunca usada
- `RF0003`: Número incorrecto de argumentos en keyword
- `RF0023`: Formato de fecha inválido
- `RF0010`: Missing keyword documentation

---

#### 📦 Escenario 2: **Robot Framework + Python Step Definitions**
**Linteres: **Robocop **+ **flake8  
_Robocop valida la sintaxis RF; flake8 valida el código Python_

Instalación:
```bash
pip install robocop flake8
```

Configuración `.flake8`:
```ini
[flake8]
max-line-length = 120
extend-ignore = E203, W503
exclude = .venv, __pycache__, features, step_definitions
```

Comandos de ejecución:
```bash
# Robocop (sintaxis RF)
robocop .

# flake8 (validación Python)
python -m flake8 step_definitions/ --max-line-length=120
```

**Cuándo usarlo:** Cuando tengas step definitions en Python (`Background`, `Given`, `When`, `Then` en archivos `.py`) además de la sintaxis Robot Framework.

---

#### 📦 Escenario 3: **Multi-framework Completo** (RF + Playwright + Karate)
**Linteres: **Robocop **+ **Biome** *(no se necesita flake8 salvo que tengas Python puro)*

Para Playwright/Karate con JavaScript/TypeScript:
```json
// .biome.json
{
  "$schema": "https://biomejs.com/schemas/1.3.0",
  "linter": {
    "enabled": true,
    "rules": {
      "noConsole": "error",
      "noUnusedVariables": "error",
      "semicolon": "error",
      "no-empty-character-class": "error"
    }
  },
  "formatter": {
    "enabled": true,
    "indentSize": 2,
    "lineWidth": 120
  }
}
```

Comandos:
```bash
# Linter JS/TS
npx biome check .

# Linter RF
robocop .

# Los 2 juntos (script en package.json)
# "lint": "biome check . && robocop ."
```

---

#### 📦 Configuración Playwright (siempre presente)
```json
// biome.json (siempre usa Playwright)
{
  "extends": ["plugin:playttier/recommended"],
  "rules": {
    "playttier/require-expect": "error",
    "no-console": "warn"
  }
}
```

Comando: `npx playwright test --trace=on` + `npx biome check .`
```

### Ejecución desde Pipeline sin Flaky Tests

**Estrategias clave:**

1. **Waits inteligentes** - Usar waits explícitos en lugar de `sleep`

   ```javascript
   await page.waitForSelector('.btn:visible', { state: 'visible' });
   // Nunca usar: await page.waitForTimeout(3000);
   ```

2. **Isolación de tests** - Cada test debe ser independiente

   ```javascript
   await test.step('Cleanup', async () => {
     await page.context().clearCookies();
   });
   ```

3. **Versionado de fixtures** - Los fixtures NO deben compartir estado

4. **Data fixtures** - Datos creados por el test, limpiados al finalizar

### Validación de Data - La Mejor Práctica

**La data debe VIVIR FUERA de la automatización:**

```
❌ MAL: Hardcodear datos en los step definitions
✅ BIEN: Externalizar datos en archivos JSON por entorno

Ejemplo estructura data/environments/:

{
  "dev": {
    "usuario": "usuario_dev",
    "password": "pass_dev",
    "url": "https://api.dev.example.com"
  },
  "qa": {
    "usuario": "usuario_qa",
    "password": "pass_qa",
    "url": "https://api.qa.example.com"
  },
  "prod": {
    "usuario": "usuario_prod",
    "password": "pass_prod",
    "url": "https://api.prod.example.com"
  }
}
```

**Patrón de implementación:**

```javascript
// support/config.js
import fs from 'fs';
import path from 'path';

const env = process.env.NODE_ENV || 'dev';
const config = JSON.parse(
  fs.readFileSync(path.join(__dirname, `../../data/environments/${env}.json`), 'utf8')
);

export default {
  baseUrl: config.url,
  credentials: {
    user: config.usuario,
    pass: config.password
  }
};
```

### Reporte de Ejecución

**Para Robot Framework:** `output.xml, log.html, metrics, historic`

**Para Playwright:** Reporte HTML integrado + traces solo en fallos

**CI Configuration (GitHub Actions):**

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix: {browser: [chrome, firefox}}
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests with traces
        run: npx playwright test --project=${{ matrix.browser }} --trace=on
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report-${{ matrix.browser }}
          path: playwright-report/
          
      - name: Upload traces
        uses: actions/upload-artifact@v3
        name: trace
        path: ./tmp/ traces/**
```

## 3. Principios para Evitar Flaky Tests

1. **No usar fixed timeouts** - Usar selectors-based waits
2. **Tests independientes** - Sin dependencia entre sí
3. **Limpiar estado** - Resetear BD, limpiar cookies entre tests
4. **Validaciones robustas** - Verificar estados específicos no texto completo
5. **Versionar datos** - Cambios en datos deben ser versionados, no inline

## 4. Validación de Data - Recomendación Principal

### El patrón dorado:

```
┌─────────────────────────────┌─────────────────────┌─────────────────────┐
│     Archivos de Data        │     Base de       │     API             │
│     externalizados          │     de pruebas   │     real            │
│     (JSON/CSV/XLSX)         │                 │                   └──► AUTOMATION
│                 │                 └───────────────────┘          │
│     └──────────────┘                QA Tests Automation         │
│              (Robot Framework / Playwright)                 │
│              CON Acceso SOLO a lectura                     │
└───────────────────────────────────────────────────────────────┘
```

**Flujo:**

1. **Datos maestros** en `data/environments/{env}.json` - Versionados en Git
2. **Datos de prueba** generados por scripts externos, NO en el código
3. **Fixtures** - Datos creados durante el test, limpiados al finalizar
4. **Validación** - Comparar contra expected outputs, no hardcodear

### Comandos recomendados para gestión de datos:

```bash
# Generar dataset de prueba (script externo)
node scripts/generate-test-data.js --env qa --count 100

# Validar consistencia
npm run validate:data -- --env prod

# Limpiar fixtures después de tests
npm run cleanup:fixtures
```

## 5. Pipeline Ejecutable Checklist

✅ Linter pasa en local y CI
✅ Tests no tienen hardcodeados datos sensibles
✅ Todos los tests usan waits explícitos (no sleep)
✅ Reports generables en cada push
✅ Tests son independientes (no dependen de orden)
✅ Data externalizada por entorno
✅ Licencias verificadas y aprobadas
✅ Versionamiento de datos maestro