# ADR-010: GitHub as First CI Target

## Context

The selected wedge lives in PR review. Supporting every CI vendor or building a hosted check service before proving the workflow would expand scope. GitHub Actions can already display workflow command annotations and step summaries from a local CLI.

## Decision

GitHub Actions is the first and only first-class CI integration for Technical MVP.

MVP GitHub output uses:

- process exit code;
- workflow command file/line/column annotations;
- `$GITHUB_STEP_SUMMARY`;
- optional repository-controlled JSON artifact upload.

It does not require:

- GitHub App;
- GitHub API calls;
- PR bot comment;
- Design Contract backend.

## Alternatives

1. **Generic CI only:** rejected because PR source annotation is part of the selected wedge and should be proven explicitly.
2. **GitHub App first:** rejected as unnecessary auth/backend complexity.
3. **GitLab + GitHub simultaneously:** deferred until the GitHub workflow proves value.

## Consequences

- PR integration is concrete and low-infrastructure;
- core/report types remain CI-vendor-neutral;
- other CI adapters can be added later as reporters without changing diff engine semantics;
- GitHub artifact retention/security remains repository-controlled.

## Status

Accepted for Technical MVP.
