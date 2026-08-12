import type { CanonicalColor, NormalizedValue, PropertyName, PropertyUnit } from "./domain.js";

export const PROPERTY_ORDER: PropertyName[] = [
  "width", "height", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "font-family", "font-size", "font-weight", "line-height", "letter-spacing", "text-content",
  "color", "background-color", "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
  "border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
  "border-top-left-radius", "border-top-right-radius", "border-bottom-right-radius", "border-bottom-left-radius", "opacity",
];

export const TOLERANCES: Partial<Record<PropertyName, number>> = {
  width: 0.5,
  height: 0.5,
  "padding-top": 0.5,
  "padding-right": 0.5,
  "padding-bottom": 0.5,
  "padding-left": 0.5,
  "font-size": 0.1,
  "line-height": 0.1,
  "letter-spacing": 0.1,
  opacity: 0.005,
};

// Нормализует конечное число и устраняет отрицательный ноль перед JSON/diff.
export function normalizeNumber(value: number): number | undefined {
  if (!Number.isFinite(value)) {
    return undefined;
  }
  return Object.is(value, -0) ? 0 : value;
}

// Ограничивает канал/alpha диапазоном канонического sRGB представления.
export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

// Переводит Figma 0..1 channels в стабильный sRGB RGBA contract.
export function normalizeFigmaColor(color: { r: number; g: number; b: number }, opacity = 1): CanonicalColor | undefined {
  if (![color.r, color.g, color.b, opacity].every(Number.isFinite)) {
    return undefined;
  }
  return { r: Math.round(clamp01(color.r) * 255), g: Math.round(clamp01(color.g) * 255), b: Math.round(clamp01(color.b) * 255), a: Number(clamp01(opacity).toFixed(6)) };
}

// Нормализует CSS family list до primary ASCII-case-insensitive token.
export function normalizeFontFamily(value: string): string {
  const primary = value.split(",")[0]?.trim() ?? "";
  return primary.replace(/^['"]|['"]$/g, "").trim().toLocaleLowerCase("en-US");
}

// Нормализует CSS text content по документированной default collapse-whitespace policy.
export function normalizeTextContent(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

// Нормализует только deterministic CSS px values; normal/percent/unknown values remain unsupported.
export function normalizeCssPx(value: string): number | undefined {
  const match = /^(-?(?:\d+\.?\d*|\.\d+))px$/u.exec(value.trim());
  return match === null ? undefined : normalizeNumber(Number(match[1]));
}

// Преобразует CSS numeric font-weight keywords в canonical integer.
export function normalizeFontWeight(value: string): number | undefined {
  if (value === "normal") return 400;
  if (value === "bold") return 700;
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= 1 && numeric <= 1000 ? numeric : undefined;
}

// Возвращает тип canonical value для выбора deterministic comparison rule.
export function propertyUnit(name: PropertyName): PropertyUnit {
  if (name === "font-family") return "font-family";
  if (name === "text-content") return "text";
  if (name === "color" || name === "background-color" || name.endsWith("-color")) return "rgba";
  if (name === "opacity") return "number";
  return "px";
}

// Проверяет, что значение является canonical color без runtime casts.
export function isCanonicalColor(value: NormalizedValue): value is CanonicalColor {
  return typeof value === "object" && value !== null && "r" in value && "g" in value && "b" in value && "a" in value;
}

// Сравнивает два canonical values с документированными starting tolerances.
export function compareNormalized(property: PropertyName, expected: NormalizedValue, actual: NormalizedValue): { equal: boolean; delta?: number; tolerance?: number } {
  if (property === "font-family" || property === "font-weight" || property === "text-content") {
    return { equal: expected === actual };
  }
  if (isCanonicalColor(expected) && isCanonicalColor(actual)) {
    return { equal: Math.abs(expected.r - actual.r) <= 1 && Math.abs(expected.g - actual.g) <= 1 && Math.abs(expected.b - actual.b) <= 1 && Math.abs(expected.a - actual.a) <= 0.005 };
  }
  if (typeof expected !== "number" || typeof actual !== "number") {
    return { equal: false };
  }
  const tolerance = TOLERANCES[property] ?? 0;
  return { equal: Math.abs(actual - expected) <= tolerance, delta: actual - expected, tolerance };
}
