import type { Plugin } from "vite";
import * as path from "node:path";
import { transformTypeScript } from "./transform.js";
import { scanImplementations } from "./scanner.js";
import type { Index } from "./scanner.js";

export interface AsyncDiPluginOptions {
  include?: RegExp;
  exclude?: RegExp;
  root?: string;
}

function isTypeScriptFile(value: string): boolean {
  return /\.(ts|tsx|mts|cts)$/.test(value);
}

export function asyncDiPlugin(options: AsyncDiPluginOptions = {}): Plugin {
  const include = options.include ?? /\.(ts|tsx|mts|cts)$/;
  const exclude = options.exclude ?? /node_modules/;
  const root = path.resolve(options.root ?? process.cwd());

  const testPattern = (pattern: RegExp, value: string): boolean => {
    const flags = pattern.flags.replace(/[gy]/g, "");
    return new RegExp(pattern.source, flags).test(value);
  };

  let index: Index | null = null;

  const ensureIndex = () => {
    if (!index) {
      index = scanImplementations(root);
    }
    return index;
  };

  const invalidateIndex = () => {
    index = null;
  };

  return {
    name: "silentwire",
    enforce: "pre",
    buildStart() {
      ensureIndex();
    },
    watchChange(id) {
      if (isTypeScriptFile(id)) invalidateIndex();
    },
    handleHotUpdate({ file }) {
      if (isTypeScriptFile(file)) invalidateIndex();
    },
    transform(code, id) {
      const cleanId = id.split("?")[0].split("#")[0];

      if (!testPattern(include, cleanId)) return null;
      if (testPattern(exclude, cleanId)) return null;

      let resolvedIndex: Index;
      try {
        resolvedIndex = ensureIndex();
      } catch (error) {
        throw error;
      }

      try {
        const result = transformTypeScript(code, cleanId, resolvedIndex, root);
        if (!result || !result.changed) return null;

        return {
          code: result.code,
          map: result.map ?? null,
        };
      } catch (error) {
        throw error;
      }
    },
  };
}