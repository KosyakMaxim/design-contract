import type { FigmaExtractionInput } from "../core/figma.js";

export const FIGMA_API_BASE_URL = "https://api.figma.com";

export interface FigmaApiClientOptions {
  token: string;
  baseUrl?: string;
  fetcher?: typeof fetch;
}

export interface FigmaRawNode {
  id: string;
  name?: string;
  type: string;
  paddingLeft?: number;
  absoluteBoundingBox?: { width?: number; height?: number };
  children?: FigmaRawNode[];
}

interface FileResponse {
  version: string;
  document: FigmaRawNode;
}

interface NodesResponse {
  nodes: Record<string, { document?: FigmaRawNode }>;
}

export interface ExactFigmaSnapshot {
  input: FigmaExtractionInput;
  root: FigmaRawNode;
}

// Ошибка Figma API без включения raw design response или token в сообщение.
export class FigmaApiError extends Error {
  readonly code: "FIGMA_AUTH_FAILED" | "FIGMA_VERSION_NOT_FOUND" | "FIGMA_NODE_NOT_FOUND" | "FIGMA_RESPONSE_INVALID" | "FIGMA_NETWORK_FAILED";

  // Создаёт типизированную ошибку adapter-level для стабильного CLI taxonomy.
  constructor(code: FigmaApiError["code"], message: string) {
    super(message);
    this.name = "FigmaApiError";
    this.code = code;
  }
}

// Проверяет shape минимального raw Figma node без привязки к private SDK типам.
function isRawNode(value: unknown): value is FigmaRawNode {
  return typeof value === "object" && value !== null && "id" in value && typeof value.id === "string" && "type" in value && typeof value.type === "string";
}

// Выполняет exact-version request и превращает HTTP/status failures в публичные ошибки adapter.
async function requestJson(url: string, token: string, fetcher: typeof fetch): Promise<unknown> {
  let response: Response;
  try {
    response = await fetcher(url, { headers: { "X-Figma-Token": token, Accept: "application/json" } });
  } catch {
    throw new FigmaApiError("FIGMA_NETWORK_FAILED", "Figma API request failed before receiving a response.");
  }
  if (response.status === 401 || response.status === 403) {
    throw new FigmaApiError("FIGMA_AUTH_FAILED", "Figma API authentication failed.");
  }
  if (response.status === 404) {
    throw new FigmaApiError("FIGMA_VERSION_NOT_FOUND", "Figma file or requested version was not found.");
  }
  if (!response.ok) {
    throw new FigmaApiError("FIGMA_NETWORK_FAILED", `Figma API returned HTTP ${response.status}.`);
  }
  const body: unknown = await response.json();
  return body;
}

// Проверяет минимальную структуру file endpoint response.
function isFileResponse(value: unknown): value is FileResponse {
  return typeof value === "object" && value !== null && "version" in value && typeof value.version === "string" && "document" in value && isRawNode(value.document);
}

// Проверяет минимальную структуру nodes endpoint response.
function isNodesResponse(value: unknown): value is NodesResponse {
  return typeof value === "object" && value !== null && "nodes" in value && typeof value.nodes === "object" && value.nodes !== null;
}

// Загружает exact file version и configured root node через официальные REST endpoints.
export async function fetchExactSnapshot(options: FigmaApiClientOptions, input: FigmaExtractionInput): Promise<ExactFigmaSnapshot> {
  const fetcher = options.fetcher ?? fetch;
  const baseUrl = options.baseUrl ?? FIGMA_API_BASE_URL;
  const fileUrl = `${baseUrl}/v1/files/${encodeURIComponent(input.fileKey)}?version=${encodeURIComponent(input.version)}&depth=1`;
  const fileResponse: unknown = await requestJson(fileUrl, options.token, fetcher);
  if (!isFileResponse(fileResponse) || fileResponse.version !== input.version) {
    throw new FigmaApiError("FIGMA_VERSION_NOT_FOUND", "Figma response cannot be tied to the requested exact version.");
  }

  const nodesUrl = `${baseUrl}/v1/files/${encodeURIComponent(input.fileKey)}/nodes?ids=${encodeURIComponent(input.rootNodeId)}&version=${encodeURIComponent(input.version)}`;
  const nodesResponse: unknown = await requestJson(nodesUrl, options.token, fetcher);
  if (!isNodesResponse(nodesResponse)) {
    throw new FigmaApiError("FIGMA_RESPONSE_INVALID", "Figma nodes response has an invalid shape.");
  }
  const nodeEntry: unknown = nodesResponse.nodes[input.rootNodeId];
  const root = typeof nodeEntry === "object" && nodeEntry !== null && "document" in nodeEntry ? nodeEntry.document : undefined;
  if (!isRawNode(root)) {
    throw new FigmaApiError("FIGMA_NODE_NOT_FOUND", `Figma node ${input.rootNodeId} was not found in the requested version.`);
  }
  return { input, root };
}
