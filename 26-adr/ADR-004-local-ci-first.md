# ADR-004: Local / CI First

## Context

The core technical risk is normalization, mapping, source ownership and determinism, not collaboration infrastructure. A hosted service would introduce token custody, source/privacy concerns, authentication, storage and billing before proving the engine.

## Decision

MVP is a local CLI and CI process running in the user's repository environment.

There is no Design Contract backend, user database, organization model, cloud screenshot storage, queue, billing or authentication service.

Figma token remains local/update-job only. Source and DOM remain in the local/CI runner.

## Alternatives

1. **Hosted SaaS first:** rejected as unrelated complexity and higher security burden.
2. **Desktop app/browser extension first:** rejected because selected wedge is PR contract, not interactive overlay.

## Consequences

- technical validation is faster and privacy posture simpler;
- collaboration/history are limited to Git, CI logs and artifacts;
- monetization infrastructure is postponed;
- future hosted layer must be separately designed from actual validated needs.

## Status

Accepted for Technical MVP.
