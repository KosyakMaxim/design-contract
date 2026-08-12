# Config and CLI

## Config file

Canonical file name:

```text
design-contract.config.json
```

JSON is chosen over executable TypeScript/YAML so parsing is deterministic, schema validation is straightforward and configuration cannot run arbitrary code.

## TypeScript config model

```ts
export interface DesignContractConfig {
  figma: {
    fileKey: string;
    tokenEnv: string;
  };

  app: {
    baseUrl: string;
    command?: {
      executable: string;
      args: string[];
    };
    readySelector?: string;
    startTimeoutMs: number;
  };

  runtime: {
    locale: string;
    timezoneId: string;
    colorScheme: "light" | "dark";
    reducedMotion: "reduce";
    fontTimeoutMs: number;
    actionTimeoutMs: number;
  };

  reporters: {
    terminal: boolean;
    json: {
      enabled: boolean;
      output: string;
    };
    github: "auto" | "on" | "off";
  };

  tests: TestCase[];
}
```

## Working example

```json
{
  "figma": {
    "fileKey": "abc123",
    "tokenEnv": "FIGMA_ACCESS_TOKEN"
  },
  "app": {
    "baseUrl": "http://127.0.0.1:5173",
    "command": {
      "executable": "npm",
      "args": ["run", "dev", "--", "--host", "127.0.0.1"]
    },
    "readySelector": "[data-app-ready]",
    "startTimeoutMs": 30000
  },
  "runtime": {
    "locale": "en-US",
    "timezoneId": "UTC",
    "colorScheme": "light",
    "reducedMotion": "reduce",
    "fontTimeoutMs": 10000,
    "actionTimeoutMs": 5000
  },
  "reporters": {
    "terminal": true,
    "json": {
      "enabled": true,
      "output": ".design-contract/results.json"
    },
    "github": "auto"
  },
  "tests": [
    {
      "id": "checkout-desktop",
      "route": "/checkout",
      "figmaNodeId": "42:1337",
      "contractNodeIds": [
        "42:1337",
        "42:1400",
        "42:1402"
      ],
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "contentPolicy": "collapse-whitespace",
      "setup": [
        {
          "type": "fill",
          "selector": "#email",
          "value": "test@example.com"
        },
        {
          "type": "click",
          "selector": "[data-test=open-summary]"
        },
        {
          "type": "waitFor",
          "selector": "[data-test=summary-ready]",
          "state": "visible"
        }
      ]
    }
  ]
}
```

## Defaults

`init` writes all defaults explicitly. The runtime implementation may still provide defensive defaults when parsing older hand-edited config.

```text
tokenEnv = FIGMA_ACCESS_TOKEN
startTimeoutMs = 30000
locale = en-US
timezoneId = UTC
colorScheme = light
reducedMotion = reduce
fontTimeoutMs = 10000
actionTimeoutMs = 5000
contentPolicy = collapse-whitespace
setup = []
github reporter = auto
```

## Validation

Use one runtime schema implementation as the source of validation and test the shipped JSON Schema/example against it.

Recommended dependency: `zod` for runtime validation. Ship a static `schema/config.schema.json` generated or maintained from the same model and fixture-test equivalence.

Validation rules include:

- `figma.fileKey` non-empty;
- `tokenEnv` valid environment variable name;
- `baseUrl` http/https URL;
- `route` begins with `/` and is same-origin relative;
- test IDs unique and filesystem-safe: `[a-z0-9][a-z0-9._-]*`;
- Figma node IDs canonical digits-colon-digits;
- `contractNodeIds` unique, non-empty and include `figmaNodeId`;
- viewport positive integers with reasonable upper bound;
- repo-relative `storageState` if present;
- setup selectors non-empty;
- setup timeouts positive;
- JSON output path repo-relative;
- unknown top-level/config fields rejected in MVP to catch typos.

## CLI implementation

Use Node's built-in argument parsing where practical. Do not add a large CLI framework only for three commands.

Executable:

```text
design-test
```

## `design-test init`

```bash
design-test init [--force]
```

Creates:

```text
design-contract.config.json
.design-contract/baselines/
```

Prints the exact Vite plugin snippet and recommended `.gitignore` entries.

It does **not** automatically edit `vite.config.ts` in MVP.

Failure if config already exists, unless `--force`.

## `design-test update`

```bash
design-test update [test-id] [--figma-version <id>] [--dry-run]
```

Behavior:

- requires token env;
- validates config before network access;
- omitted test id updates all tests, grouped by file/version;
- optional `--figma-version` forces one exact version for selected tests;
- `--dry-run` performs fetch/extraction and prints baseline diff summary but does not write files;
- stamps the current `BASELINE_SEMANTICS_VERSION` into every generated baseline; npm/tool package version is not used as baseline compatibility and is not serialized into semantic baseline content;
- never starts browser/app;
- writes baselines atomically.

If test id is unknown: configuration error, exit `2`.

## `design-test run`

```bash
design-test run [test-id] [--reporter <list>] [--no-start]
```

Behavior:

- validates config and baseline(s);
- performs zero Figma calls;
- if `app.command` exists and `--no-start` is absent, spawns command directly without an implicit shell and with child env `{ ...process.env, DESIGN_CONTRACT: "1" }`;
- the CLI-owned variable overrides an inherited conflicting value for the managed child so the supported run cannot accidentally start uninstrumented;
- always waits for `app.baseUrl` readiness;
- runs selected tests sequentially;
- default reporters come from config;
- `--reporter terminal,json,github` overrides reporter activation for this run;
- `--no-start` is intended for externally managed app processes, e.g. CI preview of an instrumented build;
- after Spike 2 is established, `--no-start` performs source-instrumentation preflight on required mapped hosts and returns `SOURCE_LOCATION_UNKNOWN` / exit `2` if valid metadata is absent.

## Environment variables

### User-facing

```text
FIGMA_ACCESS_TOKEN
```

or the env name configured by `figma.tokenEnv`.
Required only by `update`.

```text
DESIGN_CONTRACT=1
```

Enables Vite source instrumentation in dev/build. This is normally an **internal managed-launch detail** for `design-test run`: when the CLI starts `app.command`, it sets the variable automatically. Users/CI set it manually only when they build/start the app outside the CLI, including `--no-start` workflows.

### CI detection

The GitHub reporter may read standard GitHub Actions environment variables such as:

```text
GITHUB_ACTIONS
GITHUB_STEP_SUMMARY
```

No GitHub token is required to emit workflow command annotations or step summary output.

## Exit codes

```text
0 PASS
1 DESIGN_FAILURE
2 CONFIGURATION_ERROR
3 RUNTIME_ERROR
4 INTERNAL_ERROR
130 INTERRUPTED (SIGINT conventional process behavior)
```

Only `0..4` are part of the stable Design Contract result contract. `130` is process interruption behavior.

### Examples

```bash
# Initialize
npx design-test init

# Fetch current Figma design and pin exact returned version
FIGMA_ACCESS_TOKEN=... npx design-test update checkout-desktop

# Rebuild the same historical version explicitly
FIGMA_ACCESS_TOKEN=... npx design-test update checkout-desktop \
  --figma-version 987654321

# Local run; config may start Vite dev server. CLI injects DESIGN_CONTRACT=1 automatically.
npx design-test run checkout-desktop

# External/CI build must enable instrumentation itself before --no-start
DESIGN_CONTRACT=1 npm run build
npm run preview -- --host 127.0.0.1 &
npx design-test run --no-start --reporter terminal,json,github
```

## Package/runtime choices

- Node.js minimum: `>=24 <25` for Technical MVP support policy.
- CI example pins `24.19.0`.
- Package manager: npm.
- `package-lock.json` is mandatory and reviewed.
- TypeScript package versions are exact in the lockfile.
- Playwright exact version is locked; Technical MVP target is 1.62 with its bundled Chromium revision.

Supporting more Node majors is Later. One LTS runtime reduces the determinism matrix during core validation.
