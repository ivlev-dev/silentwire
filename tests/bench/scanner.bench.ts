import { test } from "vitest";
import { scanImplementations } from "../../src/scanner.js";
import * as path from "node:path";

test("scanner benchmark", async ({ bench }) => {
  const r1 = bench("scan project root", () => {
    scanImplementations(process.cwd());
  });
  await r1.run();

  const r2 = bench("scan src root", () => {
    scanImplementations(path.resolve("src"));
  });
  await r2.run();
});