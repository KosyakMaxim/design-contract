# Security and Data Handling

## Default trust model

Design Contract runs in the developer machine or repository CI runner.
The MVP has no product-operated backend and no product-operated storage.

Default product behavior:

```text
no source upload
no DOM upload
no screenshot upload
no Figma raw-content upload
no telemetry upload
```

## Figma token

- read from environment only;
- token env name is configurable; token value is never stored in config;
- needed only for `design-test update`;
- not needed for normal `run` or PR CI;
- never log request authorization headers;
- redact token-like values from unexpected error diagnostics;
- minimum read permissions only.

A Personal Access Token is sufficient for MVP. Hosted OAuth/token custody is Later and must not be designed now.

## CI secrets

Normal `run` workflow contains no Figma token.

A manual repository-controlled update workflow may use a secret, but it must never update baseline automatically as part of a normal PR gate against latest Figma.

## Source code

Design Contract reads source files only through the local Vite transform pipeline and includes **repo-relative source location metadata**, not source contents, in results.

No source file body leaves the local/CI environment through Design Contract itself.

## Source paths

Results include repo-relative paths such as:

```text
src/components/Button.vue
```

They never include absolute workstation paths.

GitHub artifacts, if enabled by the repository workflow, may contain those repo-relative paths. This is repository-controlled storage, not Design Contract cloud telemetry.

## DOM

MVP reports deterministic selectors based on explicit IDs:

```text
[data-design-node="42:1337"]
```

It does not serialize/upload the DOM tree or element HTML.

## Baseline contents

Committed baselines contain derived normalized design information:

- Figma file key;
- exact version;
- node IDs/names;
- normalized supported values;
- optional text content if the test's content policy enables it.

They do **not** contain raw Figma document JSON, tokens, screenshots or images.

Teams must review whether text content or design node names are suitable for their repository. `contentPolicy: "off"` prevents text-content contract storage when copy is sensitive or localized.

## `storageState`

Playwright storage-state files can contain sensitive cookies/tokens.

Rules:

- recommend `.design-contract/auth/` in `.gitignore`;
- never embed storageState content in reports;
- never upload it as a Design Contract artifact;
- do not print it on setup failure;
- CI should materialize it through repository-owned secret/process mechanisms.

## GitHub artifacts

The sample workflow explicitly uploads only:

```text
.design-contract/results.json
```

The result contains minimal findings, not raw source/DOM/Figma JSON.

Artifact storage is governed by the user's GitHub repository/account. Teams can remove the upload step if policy prohibits artifacts.

## GitHub annotations

Annotations necessarily transmit to GitHub:

- repo-relative file/line/column;
- property name;
- expected/actual value;
- Figma node id;
- deterministic selector.

This is an explicit consequence of choosing GitHub CI reporting. Design Contract sends it only through the CI output already controlled by the repository.

## Network policy

### `update`

Allowed external network dependency:

```text
Figma REST API only
```

### `run`

Design Contract itself does not contact Figma or a Design Contract service.
The host application under test may make whatever network calls its own fixture route makes; deterministic test data remains the repository's responsibility.

## Dependency/security hygiene

- keep dependency count small;
- commit lockfile;
- use Node built-ins for fetch, crypto, process spawning and CLI parsing where practical;
- no shell interpolation for configured app command: spawn executable + args directly;
- validate repo-relative output/source/storage paths;
- reject path traversal out of repo for product-generated files;
- avoid rendering unescaped design/text values into terminal control sequences; sanitize ANSI/control characters in human output.

## Telemetry

None in prototype/MVP. See `22-telemetry.md`.
