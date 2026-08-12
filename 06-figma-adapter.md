# Figma Adapter

## Responsibility

Transform exact-version Figma REST data into `DesignNode` objects and then a canonical `DesignBaseline`.

```text
Figma REST
→ raw file/node JSON
→ validate exact version
→ select configured contract nodes
→ extract supported raw values
→ normalize
→ DesignNode
→ DesignBaseline
```

The Figma adapter is used by `design-test update` only.

## Authentication

MVP supports Figma Personal Access Token authentication read from the environment variable named by config, defaulting to `FIGMA_ACCESS_TOKEN`.

Requirements:

- token never appears in config value, baseline, logs, JSON report, GitHub annotations or artifacts;
- required scope/permission is read access to file content;
- OAuth, hosted token custody and refresh flows are not MVP.

## Endpoints

Primary official REST operations:

```text
GET /v1/files/:key?version=<version>&depth=1
GET /v1/files/:key/nodes?ids=<comma-separated-node-ids>&version=<version>
```

When no version is explicitly requested by CLI:

1. fetch file metadata/current file to obtain the exact returned Figma version;
2. immediately fetch configured root node(s) with that exact `version` parameter;
3. persist that exact version in baseline.

When `--figma-version <id>` is passed:

1. validate/fetch the file using that exact version;
2. fetch nodes using the same exact version;
3. reject any response that cannot be tied to that exact version.

Version-history listing is not required in the normal update path and therefore does not become a separate permission dependency.

Official reference points:

- Figma REST file endpoints: https://developers.figma.com/docs/rest-api/file-endpoints/
- File node types: https://developers.figma.com/docs/rest-api/file-node-types/
- Property types: https://developers.figma.com/docs/rest-api/file-property-types/
- Rate limits: https://developers.figma.com/docs/rest-api/rate-limits/

## Rate limits

File and node reads are rate-limited by Figma and current limits vary by plan/seat. Architecture therefore assumes updates are infrequent and CI runs never hit Figma.

MVP behavior:

- group multiple root IDs for the same file/version where API shape permits;
- deduplicate identical requests during one update process;
- obey `Retry-After` on `429`;
- retry rate-limit responses at most twice;
- do not implement background polling;
- do not persist a raw Figma response cache by default.

The committed normalized baseline is the durable cache.

## Supported node types

A configured `contractNodeId` may target:

```text
FRAME
COMPONENT
INSTANCE
TEXT
RECTANGLE
```

Other descendant types are ignored if they are not in `contractNodeIds`.
A configured contract node of another type fails update with `FIGMA_NODE_TYPE_UNSUPPORTED`.

## Subtree validation

`figmaNodeId` is the root of the test contract.
Every `contractNodeId` must be the root itself or a descendant returned inside the exact root subtree.

Failure examples:

- ID absent from response: `FIGMA_NODE_NOT_FOUND`;
- ID exists in file but is outside configured subtree: `MAPPING_OUTSIDE_SUBTREE` / configuration error;
- duplicate IDs in config: `CONFIG_INVALID` before network access.

## Property extraction

The adapter extracts only P0 values that can be normalized without asserting a CSS mechanism.

### Geometry

- `width`, `height` from `absoluteBoundingBox` when geometry is axis-aligned and numeric.
- rotation/non-axis-aligned transforms cause the geometry properties to be marked unsupported for P0 rather than compared with false precision.

### Padding

For Figma Auto Layout nodes with numeric padding fields:

```text
paddingTop
paddingRight
paddingBottom
paddingLeft
```

No padding is synthesized for nodes where Figma does not expose it.

### Typography

For a non-mixed `TEXT` node:

- `font-family`;
- `font-size`;
- `font-weight`;
- explicit used line-height data resolvable to px;
- letter spacing resolvable to px;
- text content according to configured content policy;
- text color when exactly one supported visible solid text fill exists.

If the text uses mixed style ranges/overrides, typography and text-color properties are marked `mixed-text-style` and skipped. Text content may still be compared if enabled.

### Background

For `FRAME`, `COMPONENT`, `INSTANCE` and `RECTANGLE`, `background-color` is supported only when the node has exactly one relevant visible `SOLID` fill and no additional visible fill layers that change the rendered background contract.

For `TEXT`, ordinary `fills` describe glyph/text paint and are used for `color`; they are not interpreted as CSS `background-color`.

### Opacity

Node opacity defaults to `1` when omitted by the Figma model and is normalized to a number in `[0,1]`.

### Corner radii

Corner-radius P0 applies to `FRAME`, `COMPONENT`, `INSTANCE` and `RECTANGLE`.

Support:

- uniform corner radius;
- four explicit corner radii.

Do not compare radii when non-zero Figma corner smoothing is present because CSS `border-radius` alone is not semantically equivalent.

### Borders

P0 border support is deliberately narrow and applies only to `FRAME`, `COMPONENT`, `INSTANCE` and `RECTANGLE` nodes. Text glyph strokes are unsupported as CSS-border contracts.

- one visible solid stroke paint;
- non-dashed simple stroke;
- widths resolvable for four physical sides;
- stroke semantics compatible with the supported CSS-border interpretation.

Complex/unsupported stroke alignment, multiple stroke paints, gradients, dash patterns and effects are skipped.

## Variables

Variables are not required to normalize the P0 baseline. If Figma includes bound-variable references in ordinary node JSON they may be retained only as non-semantic diagnostics in future versions. The MVP baseline does not require the Variables REST endpoints and does not depend on Enterprise-only variable access.

## Unsupported properties

The adapter does not normalize:

- global x/y;
- margin;
- raw Figma Auto Layout gap as P0;
- HUG/FILL as a declaration assertion;
- gradients;
- multiple fills;
- shadows/effects;
- masks;
- blend modes;
- blur/filter parity;
- arbitrary transforms;
- vector/SVG path data;
- mixed text ranges.

## Error handling

Adapter-level errors are translated to the shared error taxonomy:

- `FIGMA_AUTH_FAILED`
- `FIGMA_RATE_LIMITED`
- `FIGMA_FILE_NOT_FOUND`
- `FIGMA_VERSION_NOT_FOUND`
- `FIGMA_NODE_NOT_FOUND`
- `FIGMA_NODE_TYPE_UNSUPPORTED`
- `FIGMA_RESPONSE_INVALID`
- `FIGMA_NETWORK_FAILED`

No raw response body containing sensitive design content is included in end-user errors by default.

## Request pseudocode

```ts
async function updateFromFigma(config: Config, tests: TestCase[], requestedVersion?: string) {
  const token = readRequiredEnv(config.figma.tokenEnv);
  const fileKey = config.figma.fileKey;

  const file = await figma.getFile({
    fileKey,
    version: requestedVersion,
    depth: 1,
    token,
  });

  const exactVersion = assertExactVersion(file.version, requestedVersion);
  const rootIds = unique(tests.map((t) => t.figmaNodeId));

  const response = await figma.getFileNodes({
    fileKey,
    version: exactVersion,
    ids: rootIds,
    token,
  });

  for (const test of tests) {
    const subtree = requireSubtree(response, test.figmaNodeId);
    validateContractMembership(subtree, test.contractNodeIds);
    const baseline = extractBaseline(test, exactVersion, subtree);
    writeCanonicalBaseline(baseline);
  }
}
```
