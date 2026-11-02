import { Value } from "./value";

// Потребитель получает Value и показывает, какие instance были выданы.
export class Consumer {
  constructor(private readonly value: Value) {}

  get id() {
    return this.value.id;
  }
}
