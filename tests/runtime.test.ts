import { describe, it, expect } from "vitest";
import { Container, CircularDependencyError, createToken } from "../src/runtime/container.js";

describe("runtime container", () => {
  it("resolves injected class factory", async () => {
    class A {}

    class B {
      constructor(public readonly a: A) {}
      static async [Symbol.for("async-di:create")](container: any) {
        return new B(await container.resolve(A));
      }
    }

    const container = new Container();
    const b = await container.resolve(B);
    expect(b).toBeInstanceOf(B);
    expect(b.a).toBeInstanceOf(A);
  });

  it("caches promise", async () => {
    class A {}
    const container = new Container();
    container.bind(A, () => new A());

    const p1 = container.resolve(A);
    const p2 = container.resolve(A);
    expect(p1).toBe(p2);
    await expect(p1).resolves.toBeInstanceOf(A);
  });

  it("detects circular dependency", async () => {
    class A {}
    class B {}
    const container = new Container();
    container.bind(A, async (c) => new (A as any)(await c.resolve(B)));
    container.bind(B, async (c) => new (B as any)(await c.resolve(A)));

    await expect(container.resolve(A)).rejects.toBeInstanceOf(CircularDependencyError);
  });

  it("supports typed token", async () => {
    interface IFoo {}
    const token = createToken<IFoo>("IFoo");
    const container = new Container();
    container.bind(token, () => ({ ok: true }));

    const value = await container.resolve(token);
    expect(value).toEqual({ ok: true });
  });

  it("supports transient scope", async () => {
    class A {}
    const container = new Container();
    container.bind(A, () => new A()).inTransientScope();

    const a1 = await container.resolve(A);
    const a2 = await container.resolve(A);
    expect(a1).not.toBe(a2);
  });

  it("supports async factory", async () => {
    const container = new Container();
    const token = createToken("X");
    container.bind(token, async () => {
      return "value";
    });

    await expect(container.resolve(token)).resolves.toBe("value");
  });

  it("shares singleton across scopes", async () => {
    class A {}
    const root = new Container("root");
    root.bind(A, () => new A());

    const scopeA = root.createScope("a");
    const scopeB = root.createScope("b");

    const instanceA = await scopeA.resolve(A);
    const instanceB = await scopeB.resolve(A);

    expect(instanceA).toBe(instanceB);
  });

  it("keeps scoped instances isolated per scope", async () => {
    class A {}
    const root = new Container("root");
    root.bind(A, () => new A()).inScopedScope();

    const scopeA = root.createScope("a");
    const scopeB = root.createScope("b");

    const instanceA = await scopeA.resolve(A);
    const instanceB = await scopeB.resolve(A);

    expect(instanceA).not.toBe(instanceB);
    expect(await scopeA.resolve(A)).toBe(instanceA);
  });

  it("does not cache transient instances", async () => {
    class A {}
    const container = new Container();
    container.bind(A, () => new A()).inTransientScope();

    const first = await container.resolve(A);
    const second = await container.resolve(A);

    expect(first).not.toBe(second);
  });

  it("retries after a rejected factory", async () => {
    class A {}
    let calls = 0;
    const container = new Container();
    container.bind(A, () => {
      calls += 1;
      if (calls === 1) throw new Error("boom");
      return new A();
    });

    await expect(container.resolve(A)).rejects.toThrow("boom");
    await expect(container.resolve(A)).resolves.toBeInstanceOf(A);
    expect(calls).toBe(2);
  });
});
