import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  isInsideRoot,
  modulePathWithoutExtension,
} from "./utils.js";

export type Index = Map<string, string[]>;

const SKIPPED_DIRECTORIES = new Set([
  "node_modules",
  "dist",
  "build",
  "out",
  "coverage",
  ".next",
  ".nuxt",
  ".vite",
  ".turbo",
]);

function walk(dir: string, root: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || SKIPPED_DIRECTORIES.has(entry.name)) continue;
    if (entry.isSymbolicLink()) continue;

    const full = path.join(dir, entry.name);
    if (!isInsideRoot(root, full)) continue;

    if (entry.isDirectory()) {
      walk(full, root, files);
    } else if (/\.(ts|tsx|mts|cts)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      files.push(full);
    }
  }
  return files;
}

function resolvedImportPath(fromFile: string, source: string): string {
  if (source.startsWith(".")) {
    const abs = path.resolve(path.dirname(fromFile), source);
    return modulePathWithoutExtension(abs);
  }
  return source;
}

function typeTokenForReference(
  file: string,
  importMap: Map<string, { source: string; typeOnly: boolean }>,
  typeNode: any
): string | null {
  if (!typeNode || typeNode.type !== "TSTypeReference") return null;
  const typeName = typeNode.typeName;
  if (!typeName) return null;

  if (typeName.type === "Identifier") {
    const importInfo = importMap.get(typeName.name);
    if (importInfo?.source) {
      return `${resolvedImportPath(file, importInfo.source)}#${typeName.name}`;
    }
    return `${modulePathWithoutExtension(file)}#${typeName.name}`;
  }

  if (typeName.type === "TSQualifiedName") {
    const prop = typeName.right?.name;
    if (!prop) return null;
    const base = typeName.left?.name;
    const importInfo = base ? importMap.get(base) : undefined;
    if (importInfo?.source) {
      return `${resolvedImportPath(file, importInfo.source)}#${prop}`;
    }
    return null;
  }

  return null;
}

function parseFile(file: string, root: string) {
  const source = fs.readFileSync(file, "utf8");
  const ast = parse(source, {
    sourceType: "module",
    plugins: ["typescript", "decorators-legacy"],
  });

  const imports = new Map<string, { source: string; typeOnly: boolean }>();
  traverse(ast, {
    ImportDeclaration(path: any) {
      const stmtTypeOnly = Boolean(path.node.importKind === "type");
      for (const spec of path.node.specifiers ?? []) {
        imports.set(spec.local.name, {
          source: String(path.node.source?.value ?? ""),
          typeOnly: stmtTypeOnly || spec.importKind === "type",
        });
      }
    },
  });

  const implementsTokens: Array<{ implToken: string; interfaceTokens: string[] }> = [];
  const classes: any[] = [];
  traverse(ast, {
    ClassDeclaration(path: any) {
      classes.push(path.node);
    },
  });

  for (const cls of classes) {
    const implName = cls.id?.name;
    if (!implName) continue;
    const implToken = `${modulePathWithoutExtension(file)}#${implName}`;
    const interfaceTokens: string[] = [];

    for (const impl of cls.implements ?? []) {
      const expression = impl.expression ?? impl;
      const token = typeTokenForReference(file, imports, {
        type: "TSTypeReference",
        typeName: expression,
      });
      if (token) interfaceTokens.push(token);
    }

    if (interfaceTokens.length > 0) {
      implementsTokens.push({ implToken, interfaceTokens });
    }
  }

  if (!isInsideRoot(root, file)) {
    return { imports, implementsTokens: [] };
  }

  return { imports, implementsTokens };
}

const scanCache = new Map<string, { signature: string; index: Index }>();

export function scanImplementations(root: string): Index {
  const resolvedRoot = path.resolve(root);
  const files = walk(resolvedRoot, resolvedRoot);
  const signature = files
    .map((file) => {
      const stats = fs.statSync(file);
      const hash = crypto
        .createHash("sha256")
        .update(fs.readFileSync(file))
        .digest("hex");
      return `${file}:${stats.mtimeMs}:${stats.size}:${hash}`;
    })
    .join("|");

  const cached = scanCache.get(resolvedRoot);
  if (cached && cached.signature === signature) {
    return new Map(cached.index);
  }

  const index: Index = new Map();

  for (const file of files) {
    try {
      const parsed = parseFile(file, resolvedRoot);
      for (const entry of parsed.implementsTokens) {
        for (const iface of entry.interfaceTokens) {
          const list = index.get(iface) ?? [];
          list.push(entry.implToken);
          index.set(iface, list);
        }
      }
    } catch {
      // Ignore parse failures.
    }
  }

  scanCache.set(resolvedRoot, { signature, index });
  return index;
}