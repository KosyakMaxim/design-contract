# Telemetry

## MVP decision

```text
Telemetry is not needed for the technical prototype or Technical MVP.
```

No telemetry SDK, endpoint, user identifier, installation ping or crash-upload service is implemented.

Reasons:

- the technical question is proven by fixtures and CI determinism;
- telemetry would add network/security/compliance surface before product value is proven;
- many useful fields are explicitly sensitive for this developer tool.

## Forbidden telemetry fields

If opt-in telemetry is considered later, it must never send:

- source code;
- repo-relative or absolute source paths unless irreversibly anonymized/aggregated;
- DOM HTML/tree;
- DOM selectors that reveal application structure;
- Figma content;
- Figma node names/IDs;
- CSS values;
- expected/actual property values;
- screenshots;
- route URL/path;
- text content;
- storageState/cookies;
- Figma tokens;
- repository remote URL.

## Later minimal anonymous events

Only after a separate privacy/product decision, possible aggregate opt-in events could be limited to data such as:

```text
cli_command_completed { command: init|update|run, result_category }
run_summary { test_count_bucket, finding_count_bucket, skipped_count_bucket }
feature_used { feature: github_reporter|storage_state|setup_action }
```

Even these are **not MVP**.

## Product validation without telemetry

Technical validation uses fixture results and explicit pilot interviews/run logs supplied voluntarily by pilot teams. Commercial analytics infrastructure is Later.
