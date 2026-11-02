import type { Store } from "./types";

// Service получит реализацию Store через конструктор.
export class Service {
  constructor(private readonly store: Store) {}

  async read() {
    return this.store.get("x");
  }
}
