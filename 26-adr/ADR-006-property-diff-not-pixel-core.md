# ADR-006: Property Diff, Not Pixel Core

## Context

The product promise is causal `expected → actual` design-contract failures. Full-page screenshot comparison is sensitive to rendering environment and usually explains that pixels changed, not which supported design property disagreed.

## Decision

Technical MVP pass/fail is based only on deterministic supported property/geometry comparisons.

No screenshot is required by Technical MVP.
No full-page pixel/perceptual diff may affect exit code.

Future element screenshots may be diagnostic evidence for unsupported visual categories but cannot silently replace property semantics.

## Alternatives

1. **Pixel-perfect screenshot gate:** rejected as a different product with more raster noise.
2. **Hybrid gate where either property or screenshot fails PR:** rejected because it obscures the contract and expands nondeterminism.
3. **AI visual comparison:** rejected because the core must be deterministic/explainable.

## Consequences

- P0 surface is intentionally smaller than full visual fidelity;
- findings are causal and source-linked;
- gradients/images/complex effects are not covered by MVP;
- broader visual catch-all can be layered later without redefining the core.

## Status

Accepted for Technical MVP.
