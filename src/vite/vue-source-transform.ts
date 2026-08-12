import { parse } from "@vue/compiler-sfc";
import { ElementTypes, NodeTypes } from "@vue/compiler-core";
import type { NodeTransform } from "@vue/compiler-core";
import type { Plugin } from "vite";
import { relative, resolve, sep } from "node:path";

interface VueSourceTransformOptions {
  repoRoot: string;
}

interface VueSourceFile {
  source: string;
}

const sourceFiles = new Map<string, VueSourceFile>();

// Нормализует Vite id, чтобы сопоставлять один и тот же SFC без query-параметров.
function stripVueQuery(id: string): string {
  return id.split("?")[0] ?? id;
}

// Запоминает полный текст SFC и offset template для точного пересчёта compiler loc.
export function createDesignContractVueSourcePlugin(): Plugin {
  return {
    name: "design-contract-vue-source-context",
    enforce: "pre",
    transform(code, id) {
      const filename = stripVueQuery(id);
      if (!filename.endsWith(".vue")) {
        return null;
      }

      const descriptor = parse(code, { filename }).descriptor;
      if (descriptor.template !== null) {
        sourceFiles.set(filename, {
          source: code,
        });
      }
      return null;
    },
  };
}

// Переводит абсолютный путь SFC в стабильный repo-relative POSIX путь.
function sourcePath(repoRoot: string, filename: string): string {
  return relative(resolve(repoRoot), resolve(filename)).split(sep).join("/");
}

// Вычисляет строку и колонку исходного SFC по абсолютному offset в полном файле.
function sourcePosition(source: string, offset: number): { line: number; column: number } {
  const prefix = source.slice(0, offset);
  const lines = prefix.split("\n");
  const line = lines.length;
  const lastLine = lines.at(-1) ?? "";
  return { line, column: lastLine.length + 1 };
}

// Создаёт compiler AST transform, добавляющий source только на native HTML elements.
export function createDesignContractVueTransform(options: VueSourceTransformOptions): NodeTransform {
  return (node, context) => {
    if (node.type !== NodeTypes.ELEMENT || node.tagType !== ElementTypes.ELEMENT) {
      return;
    }

    const filename = stripVueQuery(context.filename);
    const file = sourceFiles.get(filename);
    if (file === undefined) {
      return;
    }

    // Официальный Vue plugin передаёт переиспользованный SFC AST с offset полного файла.
    const position = sourcePosition(file.source, node.loc.start.offset);
    const value = `${sourcePath(options.repoRoot, filename)}:${position.line}:${position.column}`;
    const alreadyInstrumented = node.props.some(
      (prop) => prop.type === NodeTypes.ATTRIBUTE && prop.name === "data-design-test-source",
    );
    if (alreadyInstrumented) {
      return;
    }

    node.props.push({
      type: NodeTypes.ATTRIBUTE,
      name: "data-design-test-source",
      nameLoc: node.loc,
      value: {
        type: NodeTypes.TEXT,
        content: value,
        loc: node.loc,
      },
      loc: node.loc,
    });
  };
}
