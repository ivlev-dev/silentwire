import { Store } from "./types";

// Реализация интерфейса Store.
export class MemoryStore implements Store {
  get(key: string) {
    return `mem:${key}`;
  }
}
