# Architecture

## Architectural rule

The MVP is one npm package with internal module boundaries. Splitting those modules into independently versioned packages is deferred until a real independent consumer exists.

## Component diagram

```mermaid
flowchart TB
    CLI[CLI / Orchestrator]
    CFG[Config Loader + Validator]

    subgraph UPDATE[design-test update]
      FIGMA[Figma REST Adapter]
      DEX[Design Extractor]
      DNORM[Design-side Normalization]
      BASE[Baseline Store]
    end

    subgraph RUN[design-test run]
      VUE[Vue compiler-sfc + Vite instrumentation]
      APP[Vue 3 + Vite instrumented app]
      PW[Playwright Chromium]
      COL[Runtime Collector]
      MATCH[Explicit Matcher]
      RNORM[Runtime-side Normalization]
      DIFF[Diff Engine]
      REPORT[Reporters]
    end

    CLI --> CFG
    CLI --> FIGMA
    FIGMA --> DEX
    DEX --> DNORM
    DNORM --> BASE

    CLI --> PW
    VITE --> APP
    PW --> APP
    PW --> COL
    BASE --> MATCH
    COL --> MATCH
    MATCH --> DIFF
    BASE --> DIFF
    RNORM --> DIFF
    DIFF --> REPORT
```

`DesignNode.properties` and `RuntimeNode.properties` are already canonical `NormalizedProperty` values. The diagram shows design/runtime normalization as conceptual stages; implementation may keep shared canonical conversion helpers in `core/normalization.ts` and thin adapter-specific extractors.

## Update flow

```mermaid
sequenceDiagram
    participant U as Developer
    participant C as CLI
    participant F as Figma REST
    participant N as Extractor/Normalizer
    participant B as Baseline Store
    participant G as Git

    U->>C: design-test update [test-id]
    C->>F: GET exact/current file metadata
    F-->>C: exact version id
    C->>F: GET configured nodes at exact version
    F-->>C: raw node subtree
    C->>N: extract supported contract nodes
    N-->>C: canonical DesignBaseline
    C->>B: canonical JSON + semantic hash
    B-->>U: baseline diff summary
    U->>G: review + commit baseline
```

The normal update command performs two Tier-1-style Figma reads per file/version group at most: metadata/version resolution and node-subtree fetch. Requests for multiple tests sharing the same file/version should be grouped when practical.

## Run flow

```mermaid
sequenceDiagram
    participant C as CLI
    participant B as Baseline Store
    participant A as Vue/Vite App
    participant P as Playwright
    participant M as Matcher
    participant D as Diff
    participant R as Reporters

    C->>B: load + validate committed baseline
    Note over C,B: zero Figma calls
    alt CLI manages app.command
      C->>A: spawn with DESIGN_CONTRACT=1
    else --no-start / external app
      C->>A: wait for configured baseUrl
    end
    C->>P: launch pinned Chromium
    P->>A: navigate + setup actions
    P->>A: wait readiness/fonts + stabilize
    P->>A: collect explicit mapped DOM nodes
    A-->>P: RuntimeNode[]
    P->>M: validate one runtime node per contract id
    M-->>D: NodeMatch[] + normalized nodes
    B-->>D: DesignNode[]
    D-->>R: TestResult / RunResult
    R-->>C: terminal + JSON + optional GitHub output
    C-->>C: exit 0/1/2/3/4
```

## CI flow

```mermaid
flowchart LR
    CO[Checkout] --> NPM[npm ci]
    NPM --> BROWSER[Install pinned Playwright Chromium]
    BROWSER --> BUILD[DESIGN_CONTRACT=1 Vite build]
    BUILD --> PREVIEW[Start Vite preview]
    PREVIEW --> RUN[design-test run]
    RUN --> TERM[Terminal]
    RUN --> JSON[JSON result]
    RUN --> GH[GitHub annotations + summary]
    JSON --> ART[GitHub artifact]
    RUN --> EXIT[PR check exit code]
```

There is no Figma token in the normal PR run. CI uses an externally built preview, so the build step sets `DESIGN_CONTRACT=1`; ordinary managed local `run` injects the same variable automatically.

`SourceLocation` is optional in the base domain model so Spike 1 can execute. After Vue Spike 2A, source presence is a supported-run invariant enforced by orchestration, not by introducing a second domain type. Shadow DOM traversal is intentionally deferred to Spike 2B.

## Internal module layout

```text
src/
  core/
    domain.ts
    config.ts
    errors.ts
    canonical-json.ts
    normalization.ts
    diff.ts
  figma/
    client.ts
    extract.ts
    baseline.ts
  browser/
    runner.ts
    setup.ts
    collect.ts
    stabilize.ts
  vite/
    plugin.ts
    transform.ts
  reporting/
    terminal.ts
    json.ts
    github.ts
  cli/
    init.ts
    update.ts
    run.ts
    main.ts
```

## Dependency direction

```mermaid
flowchart BT
    CORE[core: domain/config/errors/normalization/diff]
    FIGMA[figma adapter] --> CORE
    BROWSER[browser adapter] --> CORE
    VITE[vite instrumentation] --> CORE
    REPORT[reporting] --> CORE
    CLI[cli orchestration] --> CORE
    CLI --> FIGMA
    CLI --> BROWSER
    CLI --> REPORT
```

Hard rules:

- `core` imports no Figma, Playwright, Vite or GitHub implementation.
- `figma` does not import `browser`.
- `browser` does not import `figma`.
- `reporting` accepts domain results and imports neither Playwright nor Figma.
- `vite` may use the shared `SourceLocation` serialization helper but no browser/Figma code.
- `cli` is the composition root.
- No cycles.

## Why not a monorepo

A monorepo would create multiple package manifests, version boundaries and release coordination before there is any separate consumer. The MVP has one CLI release, one Vite integration, one browser engine and one domain version. A single package keeps atomic changes and one lockfile while still preserving module boundaries.

Split into packages only when one of these becomes true:

1. Vite plugin gets a separate release cadence;
2. core engine is consumed by another tool without CLI;
3. a second framework adapter requires independently installable integrations.

## Runtime boundaries

- Figma REST is external only to `update`.
- Browser automation is external only to `run`.
- Baseline JSON is the serialization boundary between update and run.
- `RunResult` is the serialization boundary between core comparison and reporters.

## Deliberately absent architecture

No backend, database, authentication service, queues, billing, cloud object storage, screenshot service, vector database, AI service or hosted dashboard is part of the MVP.
