# Error Taxonomy

Exit codes:

```text
0 PASS
1 DESIGN_FAILURE
2 CONFIGURATION_ERROR
3 RUNTIME_ERROR
4 INTERNAL_ERROR
```

A `PROPERTY_UNSUPPORTED` diagnostic does not independently set an exit code; it becomes a skipped check. `font-availability-unverifiable` is one such reason and must never be counted as PASS.

| Error | Cause | User message | Recoverable | Exit code |
|---|---|---|---|---:|
| `CONFIG_INVALID` | Config JSON/schema/semantic validation failed | `Invalid config: <specific field/problem>` | Yes | 2 |
| `FIGMA_AUTH_FAILED` | Token missing/invalid or access denied | `Figma authentication/access failed. Check <tokenEnv> and file permissions.` | Yes | 3 |
| `FIGMA_RATE_LIMITED` | Figma returned rate limit after bounded retries | `Figma rate limit exceeded. Retry update after the server-provided delay.` | Yes | 3 |
| `FIGMA_NETWORK_FAILED` | DNS/TLS/network/server failure | `Could not reach Figma during update.` | Yes | 3 |
| `FIGMA_FILE_NOT_FOUND` | Configured file unavailable | `Figma file <key> was not found or is not accessible.` | Yes | 2 |
| `FIGMA_VERSION_NOT_FOUND` | Requested/pinned version unavailable | `Figma version <id> is not available for file <key>.` | Yes | 2 |
| `FIGMA_NODE_NOT_FOUND` | Required root/contract node absent | `Figma node <id> was not found in the requested version.` | Yes | 2 |
| `FIGMA_NODE_TYPE_UNSUPPORTED` | Contract node type outside supported set | `Figma node <id> has unsupported type <type>.` | Yes | 2 |
| `FIGMA_RESPONSE_INVALID` | API response violates expected schema | `Figma returned data Design Contract cannot safely interpret.` | Sometimes | 3 |
| `BASELINE_MISSING` | Baseline file absent | `Baseline missing for <test>. Run design-test update <test>.` | Yes | 2 |
| `BASELINE_HASH_INVALID` | Canonical hash does not match file content | `Baseline integrity check failed for <test>. Regenerate or restore the file.` | Yes | 2 |
| `BASELINE_SCHEMA_UNSUPPORTED` | Baseline schema not understood | `Baseline schema <n> is unsupported by this Design Contract version.` | Yes | 2 |
| `BASELINE_SEMANTICS_MISMATCH` | Baseline semantic compatibility version differs from current engine | `Baseline semantics version <old> is incompatible with current semantics <new>. Update explicitly.` | Yes | 2 |
| `BASELINE_STALE_CONFIG` | Test/root/membership differs from committed baseline | `Baseline no longer matches local test configuration.` | Yes | 2 |
| `APP_START_FAILED` | Configured executable could not be spawned / exited before readiness | `Application command failed to start for Design Contract.` | Yes | 3 |
| `APP_READY_TIMEOUT` | Base URL / ready selector not ready before timeout | `Application was not ready within <ms>.` | Yes | 3 |
| `BROWSER_LAUNCH_FAILED` | Playwright Chromium missing/crashed at launch | `Pinned Chromium could not be launched.` | Yes | 3 |
| `BROWSER_RUNTIME_FAILED` | Browser/page/context unexpectedly failed | `Browser runtime failed while collecting Design Contract state.` | Sometimes | 3 |
| `NAVIGATION_FAILED` | Route failed to load | `Could not navigate to <route>.` | Yes | 3 |
| `SETUP_ACTION_FAILED` | click/fill/press/wait action failed/timed out | `Setup action <n> failed for <test>: <safe reason>.` | Yes | 3 |
| `FONT_NOT_READY` | Font readiness did not settle before timeout | `Fonts were not ready within <ms>; comparison was not performed.` | Yes | 3 |
| `MAPPING_INVALID_ID` | Contract ID format invalid | `Invalid Figma node ID <id>. Expected <digits>:<digits>.` | Yes | 2 |
| `MAPPING_MISSING` | Required contract element count is zero | `No DOM element found for required Figma node <id>.` | Yes | 2 |
| `MAPPING_DUPLICATE` | Required ID appears on >1 DOM element | `Expected exactly one DOM element for <id>; found <count>.` | Yes | 2 |
| `MAPPING_OUTSIDE_SUBTREE` | Contract ID not within configured root | `Figma node <id> is outside root <root>.` | Yes | 2 |
| `SOURCE_LOCATION_UNKNOWN` | After Vue source mapping capability is required, mapped native host lacks valid instrumentation metadata; includes uninstrumented `--no-start` app | `Source ownership missing for <id>. Confirm the Vue 3 + Vite app was built/started with Design Contract instrumentation.` | Yes | 2 |
| `NO_COMPARABLE_PROPERTIES` | Mapped node has zero supported comparable P0 values | `Node <id> has no comparable supported properties; refusing false PASS.` | Yes | 2 |
| `PROPERTY_UNSUPPORTED` | One expected property is outside supported subset | `Skipped <property> on <id>: <reason>.` | Yes | - |
| `DESIGN_MISMATCH` | Comparable supported value outside tolerance | `<property>: expected <x>, actual <y>.` | Yes | 1 |
| `REPORT_WRITE_FAILED` | Configured output path invalid/unwritable | `Could not write report to <repo-relative-path>.` | Yes | 2 |
| `INTERNAL_ERROR` | Unhandled invariant/bug | `Design Contract hit an internal error. Re-run with diagnostic logging and report the issue.` | No/Unknown | 4 |

## Error output policy

Errors may include:

- test id;
- safe repo-relative path;
- Figma file/node/version identifiers;
- selector;
- property values relevant to a finding.

Errors must not include:

- Figma token;
- cookies/storageState contents;
- raw Figma file JSON;
- raw DOM HTML;
- source file contents;
- absolute local paths.

## Design mismatch is not infrastructure failure

`DESIGN_MISMATCH` is a normal product outcome and must preserve reporters/results before exiting `1`.

Configuration/runtime/internal errors should not be reformatted as design differences.
