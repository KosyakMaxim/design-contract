# ADR-008: No Autofix in MVP

## Context

A runtime difference can be caused by CSS modules, Tailwind classes, inherited rules, tokens, layout parent behavior or component props. The MVP source location identifies UI host ownership, not necessarily the declaration that should be edited.

## Decision

MVP reports findings only. It does not generate patches, AI suggestions, automatic PRs or claim to know the exact style declaration.

## Alternatives

1. **Deterministic CSS patcher:** rejected because source-style provenance is not solved.
2. **LLM-generated patch:** rejected because AI is not part of the deterministic validation wedge and adds safety/trust scope.
3. **Suggested CSS value without patch:** still deferred; even advice can imply an implementation mechanism the contract intentionally does not enforce.

## Consequences

- findings stop at expected/actual + DOM + Vue SFC native host;
- future source-style resolution can be investigated independently;
- product avoids turning validation evidence into unsafe edits before attribution is proven.

## Status

Accepted for Technical MVP.
