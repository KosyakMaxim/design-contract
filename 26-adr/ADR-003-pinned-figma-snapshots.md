# ADR-003: Pinned Figma Snapshots

## Context

Figma is mutable and API calls are rate-limited. A CI oracle that silently follows latest design can break without a code change and makes historical PR results unreproducible.

## Decision

`design-test update` is the only command that accesses Figma.

It resolves an exact Figma version, fetches configured nodes at that version, normalizes supported values and writes a canonical baseline committed to Git.

`design-test run` reads only the committed baseline and must make zero Figma calls.

Baseline change is a normal reviewable Git change.

## Alternatives

1. **Latest Figma on every CI run:** rejected as mutable and rate-limit-heavy.
2. **Store raw Figma JSON:** rejected because it is noisy, broad, larger and exposes unnecessary content.
3. **Hosted baseline service:** rejected because local/CI-first proof does not need backend custody.

## Consequences

- CI is reproducible and works without Figma token;
- design changes require explicit ownership/review;
- teams must decide when to update baseline;
- baseline semantic changes require explicit baseline regeneration; ordinary npm/tool version changes do not.

## Status

Accepted for Technical MVP.
