import { test } from "vitest";
import { Container } from "../../src/runtime/container.js";

class A {}

class B {
  constructor(public readonly a: A) {}
  static async [Symbol.for("async-di:create")](container: any) {
    return new B(await container.resolve(A));
  }
}

test("runtime benchmark", async ({ bench }) => {
  const r1 = bench("resolve singleton", async () => {
    const container = new Container("bench");
    container.bind(A, () => new A());
    await container.resolve(B);
  });
  await r1.run();

  const r2 = bench("deep chain resolve", async () => {
    class Leaf {}
    class Mid {
      constructor(public x: Leaf) {}
      static async [Symbol.for("async-di:create")](c: any) {
        return new Mid(await c.resolve(Leaf));
      }
    }
    class Root {
      constructor(public x: Mid) {}
      static async [Symbol.for("async-di:create")](c: any) {
        return new Root(await c.resolve(Mid));
      }
    }
    const container = new Container("bench");
    await container.resolve(Root);
  });
  await r2.run();
});