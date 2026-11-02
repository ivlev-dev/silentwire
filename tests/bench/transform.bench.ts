import { test } from "vitest";
import { transformTypeScript } from "../../src/transform.js";

test("transform benchmark", async ({ bench }) => {
  const code = `
import { A } from "./a";

export class B {
  constructor(private readonly a: A) {}
  async use() {
    return this.a.value;
  }
}
`;

  const r1 = bench("transform small module", () => {
    transformTypeScript(code, "/x/b.ts");
  });
  await r1.run();

  const large = `${code}\n`.repeat(50);
  const r2 = bench("transform large module", () => {
    transformTypeScript(large, "/x/large.ts");
  });
  await r2.run();
});