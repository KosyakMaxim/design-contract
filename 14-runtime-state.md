# Runtime State

Design Contract needs enough state setup to reach deterministic UI states but must not become a general E2E framework.

## Route

Each test has one explicit same-origin route:

```json
"route": "/checkout"
```

No route discovery, sitemap crawling or arbitrary external URL testing.

## Viewport

Every test declares:

```json
"viewport": { "width": 1440, "height": 900 }
```

Responsive behavior is represented by another explicit test case with another explicit Figma root and viewport.

Example:

```json
{
  "id": "checkout-mobile",
  "route": "/checkout",
  "figmaNodeId": "42:2000",
  "contractNodeIds": ["42:2000", "42:2010"],
  "viewport": { "width": 390, "height": 844 },
  "contentPolicy": "collapse-whitespace",
  "setup": []
}
```

No breakpoint inference or interpolation exists.

## `storageState`

Optional repo-relative path:

```json
"storageState": ".design-contract/auth/user.json"
```

It is passed to a fresh Playwright context.

Security rules:

- recommended Git-ignored;
- may contain credentials/cookies and must not be uploaded by Design Contract;
- CI can materialize it from repository/environment secrets before run;
- each test gets a fresh context initialized from the file, so state mutations do not leak to the next test.

## Setup actions

MVP supports exactly four action types.

### Click

```json
{
  "type": "click",
  "selector": "[data-test=open-menu]"
}
```

Uses a strict Playwright locator and built-in actionability waiting.

### Fill

```json
{
  "type": "fill",
  "selector": "#email",
  "value": "test@example.com"
}
```

### Press

```json
{
  "type": "press",
  "selector": "#email",
  "key": "Enter"
}
```

### WaitFor

```json
{
  "type": "waitFor",
  "selector": "[role=dialog]",
  "state": "visible"
}
```

Allowed states:

```text
attached
visible
hidden
detached
```

## Timeouts

Global action timeout defaults to 5000ms.
An action may override it with `timeoutMs`.

Timeout is a runtime error, not a design difference:

```text
SETUP_ACTION_FAILED
exit code 3
```

## App-ready behavior

`app.readySelector`, if configured, must be visible before setup begins.

After setup, the user is responsible for adding an explicit `waitFor` action when an interaction triggers async UI that matters to the measured state. Design Contract does not infer network-idle or application-specific readiness.

## Motion

Animations/transitions are disabled by the browser adapter for measurement. No action may ask Design Contract to compare an animation midpoint.

## Hover and focus

`hover` and `focus` are **Later**, not MVP.

This resolves due-diligence disagreement in favor of the narrower implementation contract. They can be added after the core is deterministic, using the same explicit action model.

## Supported state examples

MVP can reach:

- static route;
- authenticated route via pre-created `storageState`;
- modal opened by click;
- dropdown opened by click;
- validation state reached by fill + press/click;
- async panel reached by action + explicit wait.

## Explicitly unsupported state machinery

- arbitrary JavaScript callbacks;
- branching/loops in setup;
- network recording/replay owned by Design Contract;
- automatic mock generation;
- data factories;
- cross-test shared state;
- hover/focus in Technical MVP;
- animation timeline position;
- AI-discovered flows;
- real production user data orchestration.

If a state needs complex E2E orchestration, the host application should expose a deterministic fixture route/state or prepare it outside Design Contract.
