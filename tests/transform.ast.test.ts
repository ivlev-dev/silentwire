import { describe, it, expect } from "vitest";
import { transformTypeScript } from "../src/transform.js";

describe("transform AST edge cases", () => {
  it("handles parameter properties", () => {
    const code = `
import { A } from "./a";

export class B {
  constructor(private readonly a: A) {}
}
`;
    const result = transformTypeScript(code, "/x/b.ts");
    expect(result?.changed).toBe(true);
    expect(result?.code).toContain('static async [Symbol.for("async-di:create")]');
    expect(result?.code).toContain("await container.resolve(A)");
  });

  it("handles default parameter values by retaining constructor type", () => {
    const code = `
import { A } from "./a";

export class B {
  constructor(private readonly a: A = new A()) {}
}
`;
    const result = transformTypeScript(code, "/x/b.ts");
    expect(result?.changed).toBe(true);
    expect(result?.code).toContain("await container.resolve(A)");
  });

  it("handles decorated classes", () => {
    const code = `
import { A } from "./a";

function logged(value: any, context: any) {
  return value;
}

@logged
export class B {
  constructor(private readonly a: A) {}
}
`;
    const result = transformTypeScript(code, "/x/b.ts");
    expect(result?.changed).toBe(true);
    expect(result?.code).toContain("await container.resolve(A)");
  });

  it("transforms qualified resolve calls when the type is a local alias", () => {
    const code = `
export const run = async (container: any) => {
  return container.resolve<Types.A>();
};
`;
    // Qualified property access is rejected explicitly rather than silently transformed.
    expect(() => transformTypeScript(code, "/x/b.ts")).toThrow("cannot resolve type");
  });
});