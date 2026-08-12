# MVP Scope

The table below is authoritative. A coding agent must not promote `LATER` or `REJECTED` work into MVP without an ADR approved outside the implementation run.

| Capability | Status | Notes |
|---|---|---|
| TypeScript implementation | IN | Single npm package |
| Node.js 24 LTS | IN | Exact version pinned in CI |
| npm + package-lock | IN | `npm ci` in CI |
| Vue 3 | IN | Only Vue 3 runtime scope |
| Vite | IN | Only Vite integration |
| Next.js | OUT / LATER | Separate compiler integration required |
| Svelte | LATER | Not part of technical MVP |
| Angular | REJECTED for initial product | Too broad for current wedge proof |
| `design-test init` | IN | Creates skeleton config/directories; does not silently rewrite app code |
| `design-test update [test-id]` | IN | Only command that talks to Figma |
| `design-test run [test-id]` | IN | Offline from Figma |
| Figma REST PAT auth | IN | Token via configured environment variable |
| OAuth | LATER | No auth service in MVP |
| Exact Figma version | IN | Baseline records immutable version id |
| Git-committed normalized baseline | IN | One baseline per test |
| Automatic latest-Figma CI | REJECTED | Violates design baseline contract |
| Explicit `data-design-node` | IN | Canonical runtime mapping |
| Explicit `contractNodeIds` in config | IN | Declares which IDs are required members of the test contract; setup duplication is a pilot ergonomics risk |
| Heuristic mapping | REJECTED | No fallback |
| Confidence score | REJECTED | Explicit mapping has no probabilistic match |
| Mapping helper component / logical-key/config authoring layer | OUT / POST-MVP PILOT | Raw attribute remains only MVP API; evaluate ergonomics later without heuristics |
| Vite Vue SFC host instrumentation | IN | Injects native template source ownership metadata in test builds |
| CSS declaration/source resolution | LATER | Vue native template host ownership only in MVP |
| Playwright Chromium | IN | Bundled browser, pinned through lockfile |
| Explicit viewport | IN | Width/height per test case |
| Multiple independent viewports/tests | IN | No interpolation |
| `storageState` | IN | Optional, user-owned file |
| setup: click | IN | Restricted deterministic action |
| setup: fill | IN | Restricted deterministic action |
| setup: press | IN | Restricted deterministic action |
| setup: waitFor | IN | Restricted deterministic action |
| setup: hover | LATER | Removed from MVP reconciliation |
| setup: focus | LATER | Removed from MVP reconciliation |
| arbitrary JavaScript setup | REJECTED | Avoid becoming E2E framework |
| cross-origin iframes | OUT | Unsupported |
| shadow-root traversal | OUT | Unsupported |
| portals | IN if in main document | Explicit IDs still resolve globally |
| P0 property contract | IN | Exact whitelist in normalization spec |
| global x/y | OUT | Too noisy |
| margin as Figma contract | REJECTED | No universal Figma equivalent |
| gap declaration equality | OUT / P1 | Not P0; implementation mechanism must not be enforced |
| HUG/FILL declaration equality | REJECTED | Compare resulting P0 geometry only |
| gradients / multiple fills | OUT / LATER | Unsupported P0 |
| complex shadows | OUT / LATER | Unsupported P0 |
| filters / blur / blend modes | REJECTED for MVP | No deterministic core support |
| masks / arbitrary transforms | REJECTED for MVP | No deterministic core support |
| SVG path equality | REJECTED | Screenshot/vector-specific problem |
| mixed text style ranges | OUT | Requires range-level mapping |
| terminal reporter | IN | Always available |
| JSON reporter | IN | Deterministic default schema |
| exit codes | IN | 0/1/2/3/4 categories |
| GitHub Actions annotations | IN | Workflow commands, no GitHub App |
| GitHub step summary | IN | `$GITHUB_STEP_SUMMARY` |
| JSON GitHub artifact | IN | Explicit repo-controlled upload only |
| JUnit | LATER | Not required for wedge proof |
| HTML report | LATER | No report UI in MVP |
| PR bot comment | LATER | GitHub annotations/check output are enough |
| screenshot capture | OUT | Not required by Technical MVP |
| screenshot/pixel CI gate | REJECTED | Property contract is core |
| AI | REJECTED | No AI dependency |
| autofix | REJECTED | No patch generation |
| SaaS backend | REJECTED for MVP | No accounts/storage/queues |
| billing / licenses | REJECTED for MVP | Technical core first |
| telemetry | OUT | Prototype has none |
| cloud source/DOM/Figma upload | REJECTED | Local/CI first |
