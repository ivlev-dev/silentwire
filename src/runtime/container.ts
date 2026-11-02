import { DI_CREATE, createToken, type Token } from "./symbol.js";

export type ScopeName = "singleton" | "transient" | "scoped";

export interface Binding<T = unknown> {
  factory: (container: Container) => T | Promise<T>;
  scope: ScopeName;
}

export class CircularDependencyError extends Error {
  constructor(public readonly path: unknown[]) {
    super(`Circular dependency detected: ${path.map(String).join(" -> ")}`);
    this.name = "CircularDependencyError";
  }
}

export class Container {
  readonly name: string;
  private parent?: Container;
  private children = new Set<Container>();
  private bindings = new Map<unknown, Binding>();
  private cache = new Map<unknown, Promise<unknown>>();
  private resolving = new Set<unknown>();

  constructor(name = "root", parent?: Container) {
    this.name = name;
    this.parent = parent;
  }

  bind<T = unknown>(token: unknown, factory?: unknown) {
    const binding: Binding<T> = {
      factory: this.toFactory(factory) as Binding<T>["factory"],
      scope: "singleton",
    };
    this.bindings.set(token, binding);
    this.clearCache(token);

    const builder = {
      inSingletonScope: () => {
        binding.scope = "singleton";
        return builder;
      },
      inTransientScope: () => {
        binding.scope = "transient";
        return builder;
      },
      inScopedScope: () => {
        binding.scope = "scoped";
        return builder;
      },
    };

    return builder;
  }

  private toFactory(factory: unknown): Binding["factory"] {
    if (factory === undefined) {
      return async () => undefined;
    }

    if (typeof factory === "function") {
      const fn = factory as (...args: any[]) => any;
      const source = fn.toString().trim();
      const isClass = /^class\b/.test(source);

      if (isClass) {
        return async (container: Container) => {
          const classFactory = (factory as any)[DI_CREATE];
          if (typeof classFactory === "function") {
            return classFactory.call(factory, container);
          }
          return new (factory as any)();
        };
      }

      return async (container: Container) => fn(container);
    }

    return async () => factory;
  }

  createScope(name = `scope:${Math.random()}`) {
    const scope = new Container(name, this);
    this.children.add(scope);
    return scope;
  }

  private findBindingWithOwner(token: unknown): { binding: Binding; owner: Container } | undefined {
    if (this.bindings.has(token)) {
      return { binding: this.bindings.get(token)!, owner: this };
    }
    return this.parent?.findBindingWithOwner(token);
  }

  resolve<T = unknown>(token?: unknown): Promise<T> {
    if (token === undefined) {
      throw new Error("Async DI: resolve<T>() must be transformed by async-di before runtime");
    }

    const foundBinding = this.findBindingWithOwner(token);

    // Some tokens may be classes not explicitly bound.
    if (!foundBinding && typeof token === "function") {
      const fallbackBinding: Binding = {
        factory: async (container: Container) => {
          const cls = token as any;
          if (typeof cls[DI_CREATE] === "function") {
            return cls[DI_CREATE](container);
          }
          return new cls();
        },
        scope: "singleton",
      };
      this.bindings.set(token, fallbackBinding);
      return this.resolve(token);
    }

    if (!foundBinding) {
      throw new Error(`Async DI: no binding registered for token ${String(token)}`);
    }

    const { binding, owner } = foundBinding;

    // Singleton bindings live in the owner container so that all scopes share one instance.
    // Scoped and transient bindings live in the container where resolution started.
    const cacheContainer = binding.scope === "singleton" ? owner : this;

    const cached = cacheContainer.cache.get(token);
    if (cached) return cached as Promise<T>;

    if (cacheContainer.resolving.has(token)) {
      throw new CircularDependencyError([...cacheContainer.resolving]);
    }

    cacheContainer.resolving.add(token);

    const instantiate = async () => {
      try {
        return await binding.factory(cacheContainer);
      } finally {
        cacheContainer.resolving.delete(token);
      }
    };

    const promise = instantiate().catch((error) => {
      cacheContainer.cache.delete(token);
      throw error;
    });

    cacheContainer.cache.set(token, promise);

    if (binding.scope === "transient") {
      promise.finally(() => {
        cacheContainer.cache.delete(token);
      });
    }

    return promise as Promise<T>;
  }

  clearCache(token?: unknown) {
    if (token === undefined) {
      this.cache.clear();
    } else {
      this.cache.delete(token);
    }
    for (const child of this.children) {
      child.clearCache(token);
    }
  }
}

export const container = new Container("root");
export { createToken, type Token };
export { DI_CREATE };
