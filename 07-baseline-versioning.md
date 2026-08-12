# Baseline Versioning

## Core invariant

```text
design-test run DOES NOT call Figma.
```

The baseline is the reviewed bridge between mutable design and deterministic CI.

## Update workflow

```text
current or requested exact Figma version
        ↓
design-test update [test-id]
        ↓
validated exact root subtree
        ↓
P0 extraction + normalization
        ↓
canonical DesignBaseline JSON
        ↓
Git diff / review / commit
```

## Location

```text
.design-contract/
  baselines/
    checkout-desktop.json
    checkout-mobile.json
  results.json
```

`results.json` is generated and ignored by Git. Baselines are committed.

## Canonical baseline schema

```json
{
  "schemaVersion": 1,
  "baselineSemanticsVersion": 1,
  "testId": "checkout-desktop",
  "figma": {
    "fileKey": "abc123",
    "version": "987654321",
    "rootNodeId": "42:1337"
  },
  "contractNodeIds": [
    "42:1337",
    "42:1400"
  ],
  "nodes": {
    "42:1337": {
      "id": "42:1337",
      "name": "CheckoutCard",
      "type": "FRAME",
      "properties": {},
      "unsupported": []
    }
  },
  "semanticHash": "sha256:<hex>"
}
```

The npm/tool package version is intentionally not stored in semantic baseline content. A reporter/CLI/Vite-plugin patch release must not create baseline Git churn when baseline meaning is unchanged.

## `schemaVersion` vs `baselineSemanticsVersion`

`schemaVersion` describes the serialized structural schema understood by the loader.

`baselineSemanticsVersion` describes the meaning of normalized baseline data. It increments only when an existing baseline can no longer be interpreted with exactly the same semantic contract, for example when any of these change:

- Figma property extraction semantics;
- normalization semantics or canonical units/values;
- supported canonical value interpretation;
- serialized baseline fields in a way that changes semantic content;
- interpretation of an existing field.

It does **not** increment for:

- terminal/JSON/GitHub reporter fixes;
- CLI wording or UX changes;
- documentation-only changes;
- Vite instrumentation fixes that do not alter baseline data;
- internal refactoring with identical normalized baseline semantics;
- ordinary npm patch/minor releases that preserve the baseline contract.

Technical MVP constant:

```ts
const BASELINE_SEMANTICS_VERSION = 1 as const;
```

## Fields intentionally omitted

No volatile timestamp is part of baseline semantic content.

Do not include:

- `toolVersion` / npm package version;
- `fetchedAt`;
- local machine path;
- access token;
- request id;
- response timing;
- generated random UUID;
- latest-version check result.

A Figma `lastModified` value is not needed for replay and is omitted from the semantic baseline to reduce irrelevant Git churn.

## Stable ordering

Before serialization:

1. `contractNodeIds` sorted lexicographically;
2. `nodes` object emitted by lexicographically sorted node id;
3. property keys emitted in canonical `PROPERTY_ORDER` from `11-normalization.md`;
4. unsupported entries sorted by property order then reason;
5. JSON pretty-printed with two spaces and a final newline;
6. numeric `-0` normalized to `0`;
7. finite numeric values rounded by the canonical normalization function, not by reporter formatting.

## Semantic hash

`semanticHash` is SHA-256 over canonical JSON of the baseline **excluding `semanticHash` itself**.

The hash covers:

- schema version;
- baseline semantics version;
- test id;
- exact Figma file/version/root;
- contract membership;
- canonical nodes/properties/unsupported diagnostics.

`run` recomputes and verifies it before browser launch.

Hash mismatch: `BASELINE_HASH_INVALID`, exit `2`.

## Baseline semantics compatibility gate

MVP rule:

```text
baseline.baselineSemanticsVersion == running BASELINE_SEMANTICS_VERSION
```

If not equal, `run` fails with `BASELINE_SEMANTICS_MISMATCH` and instructs the user to regenerate the baseline explicitly under the current semantics.

A change in npm/package version alone must **not** cause this failure. Tests must prove that package version `0.1.0 → 0.1.1` with `BASELINE_SEMANTICS_VERSION = 1` still accepts the same baseline byte-for-byte.

## Schema migrations

MVP supports schema `1` only.

There is no silent in-place migration command. When a future schema or semantics version is introduced:

- incompatible baselines fail clearly;
- user regenerates using `design-test update --figma-version <stored-version>` where that version remains available;
- a dedicated migration tool may be added later only if real repositories require it.

A semantics-version bump requires an ADR describing why existing baselines changed meaning and whether regeneration is sufficient.

## Stale baseline semantics

Design Contract never labels a baseline stale merely because Figma has changed. That would require calling latest Figma and violate the contract.

A baseline is invalid/stale only relative to local configuration/semantic compatibility, for example:

- config test id changed;
- `figmaNodeId` changed;
- `contractNodeIds` differ;
- schema unsupported;
- baseline semantics version differs;
- semantic hash invalid.

A package version change with unchanged `baselineSemanticsVersion` is explicitly **not** stale.

These are configuration failures, not design mismatches.

## Update errors

`design-test update` is atomic per baseline file:

1. fetch and normalize in memory;
2. validate all contract nodes;
3. stamp the current `BASELINE_SEMANTICS_VERSION`;
4. build full canonical JSON;
5. write to temp file in same directory;
6. rename atomically over destination.

A failed update never leaves a partially rewritten baseline.

## Git review semantics

A baseline change is a design-specification or baseline-semantics change. Reviewers should be able to see:

```diff
- "padding-left": 20
+ "padding-left": 24
```

without unrelated tool-version/timestamp noise.

Changing implementation does not automatically update baseline. Changing Figma does not automatically update implementation or CI expectation.
