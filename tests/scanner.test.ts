import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { scanImplementations } from "../src/scanner.js";

describe("scanner", () => {
  it("indexes classes implementing interfaces", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "silentwire-scanner-"));
    fs.mkdirSync(path.join(root, "src"), { recursive: true });
    fs.writeFileSync(path.join(root, "src", "types.ts"), "export interface Store { get(key: string): string; }\n");
    fs.writeFileSync(
      path.join(root, "src", "memory-store.ts"),
      'import { Store } from "./types";\n\nexport class MemoryStore implements Store {\n  get(key: string) { return `mem:${key}`; }\n}\n'
    );

    const index = scanImplementations(path.join(root, "src"));
    const interfaceToken = path.join(root, "src", "types").replace(/\\/g, "/") + "#Store";

    expect(index.has(interfaceToken)).toBe(true);
    expect(index.get(interfaceToken)).toEqual([
      path.join(root, "src", "memory-store").replace(/\\/g, "/") + "#MemoryStore",
    ]);

    fs.rmSync(root, { recursive: true, force: true });
  });

  it("is not invalidated incorrectly by repeated scans", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "silentwire-cache-"));
    fs.mkdirSync(path.join(root, "src"), { recursive: true });
    fs.writeFileSync(path.join(root, "src", "types.ts"), "export interface Store { get(key: string): string; }\n");
    fs.writeFileSync(
      path.join(root, "src", "impl.ts"),
      'import type { Store } from "./types";\n\nexport class Impl implements Store {\n  get() { return "ok"; }\n}\n'
    );

    const first = scanImplementations(path.join(root, "src"));
    const second = scanImplementations(path.join(root, "src"));

    expect(first.size).toBe(second.size);
    expect([...first.entries()]).toEqual([...second.entries()]);

    fs.rmSync(root, { recursive: true, force: true });
  });

  it("ignores output directories and declaration files", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "silentwire-output-"));
    const src = path.join(root, "src");
    const dist = path.join(root, "dist");
    fs.mkdirSync(src, { recursive: true });
    fs.mkdirSync(dist, { recursive: true });
    fs.writeFileSync(path.join(src, "types.ts"), "export interface Store { get(key: string): string; }\n");
    fs.writeFileSync(
      path.join(src, "impl.ts"),
      'import type { Store } from "./types";\n\nexport class SrcImpl implements Store {\n  get() { return "src"; }\n}\n'
    );
    fs.writeFileSync(
      path.join(dist, "generated.d.ts"),
      'export class DistImpl implements Store {\n  get() { return "dist"; }\n}\n'
    );
    fs.mkdirSync(path.join(dist, "nested"), { recursive: true });
    fs.writeFileSync(
      path.join(dist, "nested", "impl.ts"),
      'import type { Store } from "../src/types";\n\nexport class NestedImpl implements Store {\n  get() { return "nested"; }\n}\n'
    );

    const index = scanImplementations(root);
    const token = path.join(src, "types").replace(/\\/g, "/") + "#Store";
    expect(index.get(token)).toEqual([
      path.join(src, "impl").replace(/\\/g, "/") + "#SrcImpl",
    ]);

    fs.rmSync(root, { recursive: true, force: true });
  });

  it("invalidates cache when implementations change", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "silentwire-cache-change-"));
    const src = path.join(root, "src");
    fs.mkdirSync(src, { recursive: true });
    fs.writeFileSync(path.join(src, "types.ts"), "export interface Store { get(key: string): string; }\n");
    fs.writeFileSync(
      path.join(src, "impl-a.ts"),
      'import type { Store } from "./types";\n\nexport class ImplA implements Store {\n  get() { return "a"; }\n}\n'
    );

    const before = scanImplementations(src);
    const token = path.join(src, "types").replace(/\\/g, "/") + "#Store";
    expect(before.get(token)).toHaveLength(1);

    // Ensure mtime advances; some filesystems have coarse mtime granularity.
    const future = new Date(Date.now() + 5000);
    fs.utimesSync(path.join(src, "impl-a.ts"), future, future);

    fs.writeFileSync(
      path.join(src, "impl-b.ts"),
      'import type { Store } from "./types";\n\nexport class ImplB implements Store {\n  get() { return "b"; }\n}\n'
    );

    const after = scanImplementations(src);
    expect(after.get(token)).toHaveLength(2);

    fs.rmSync(root, { recursive: true, force: true });
  });
});
