import * as path from "node:path";

export function toPosix(value: string): string {
  return value.replace(/\\/g, "/");
}

export function stripExtension(value: string): string {
  const slash = Math.max(value.lastIndexOf("/"), value.lastIndexOf("\\"));
  const dot = value.lastIndexOf(".");
  if (dot > slash) return value.slice(0, dot);
  return value;
}

export function canonicalFile(filePath: string): string {
  return toPosix(path.resolve(filePath));
}

export function modulePathWithoutExtension(filePath: string): string {
  return stripExtension(canonicalFile(filePath));
}

export function relativeModuleSpecifier(fromFile: string, toModuleWithoutExt: string): string {
  let relative = path.relative(path.dirname(canonicalFile(fromFile)), toModuleWithoutExt);
  relative = toPosix(relative);
  if (!relative.startsWith(".")) relative = `./${relative}`;
  return `${relative}.js`;
}

export function isInsideRoot(root: string, target: string): boolean {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  const relative = path.relative(resolvedRoot, resolvedTarget);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function jsString(value: string): string {
  return JSON.stringify(value);
}

