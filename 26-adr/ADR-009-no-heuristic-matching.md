# ADR-009: No Heuristic Matching or Fallback

## Context

Even with explicit mapping as the primary path, it is tempting to make setup “friendlier” by guessing when an ID is missing or duplicated. In CI this turns configuration errors into hidden probabilistic decisions.

## Decision

There is no fallback matching path.

```text
missing → configuration error
duplicate → configuration error
invalid id → configuration error
outside subtree → configuration error
```

The engine never selects a candidate based on text, tree, geometry, visual similarity or confidence.

A `NodeMatch` always has:

```ts
strategy: "explicit"
```

There is no confidence field because confidence is not probabilistic for a valid exact match.

## Alternatives

1. **Explicit first, heuristic fallback:** rejected because failures become non-obvious and results can change when layout/text changes.
2. **Show candidates but fail:** candidates might be useful in a future setup assistant, but they are outside the run contract and are not implemented in MVP.
3. **Best-effort local, strict CI:** rejected because local and CI results would differ semantically.

## Consequences

- configuration burden stays visible;
- output trust is higher;
- a missing annotation blocks rather than producing a questionable pass/finding;
- future setup tooling must remain clearly separate from contract execution.

## Status

Accepted for Technical MVP.
