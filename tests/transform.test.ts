import { describe, it, expect } from "vitest";
import { transformTypeScript } from "../src/transform.js";

describe("transform", () => {
  it("injects factory for resolvable class", () => {
    const code = `
import { A } from "./a";

export class B {
  constructor(private readonly a: A) {}
}
`;
    const result = transformTypeScript(code, "/x/b.ts");
    expect(result?.changed).toBe(true);
    expect(result?.code).toContain('static async [Symbol.for("silentwire:create")]');
    expect(result?.code).toContain("await container.resolve(A)");
  });

  it("skips primitive dependency", () => {
    const code = `
export class B {
  constructor(private readonly a: number) {}
}
`;
    const result = transformTypeScript(code, "/x/b.ts");
    expect(result).toBeNull();
  });

  it("skips type-only import", () => {
    const code = `
import type { A } from "./a";

export class B {
  constructor(private readonly a: A) {}
}
`;
    const result = transformTypeScript(code, "/x/b.ts");
    expect(result).toBeNull();
  });

  it("injects implementation token for interface", () => {
    const index = new Map<string, string[]>();
    index.set("/x/a#A", ["/x/a-impl#AImpl"]);
    const code = `
import type { A } from "./a";

export class B {
  constructor(private readonly a: A) {}
}
`;
    const result = transformTypeScript(code, "/x/b.ts", index);
    expect(result?.changed).toBe(true);
    expect(result?.code).toContain('Symbol.for("silentwire:create")');
    expect(result?.code).toContain("AImpl");
  });

  it("transforms resolve calls using concrete classes", () => {
    const code = `
export class A {}

export class B {
  use(a: A) {
    return a;
  }
}

async function run(container: any) {
  return container.resolve<A>();
}
`;
    const result = transformTypeScript(code, "/x/b.ts");
    expect(result?.changed).toBe(true);
    expect(result?.code).toContain(".resolve(A)");
  });

  it("transforms qualified interface dependencies using the interface member name", () => {
    const index = new Map<string, string[]>();
    index.set("/x/types#Store", ["/x/memory-store#MemoryStore"]);
    const code = `
import type * as Types from "./types";

export class Service {
  constructor(private readonly store: Types.Store) {}
}
`;
    const result = transformTypeScript(code, "/x/service.ts", index);
    expect(result?.changed).toBe(true);
    expect(result?.code).toContain("MemoryStore");
  });

  it("transforms qualified resolve calls to implementation tokens", () => {
    const index = new Map<string, string[]>();
    index.set("/x/types#Store", ["/x/memory-store#MemoryStore"]);
    const code = `
import type * as Types from "./types";

async function run(container: any) {
  return container.resolve<Types.Store>();
}
`;
    const result = transformTypeScript(code, "/x/service.ts", index);
    expect(result?.changed).toBe(true);
    expect(result?.code).toContain("MemoryStore");
    expect(result?.code).toContain(".resolve(");
  });
});
