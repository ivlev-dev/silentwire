import { container } from "../../src/runtime/container.js";

import { Value } from "./value.js";
import { Consumer } from "./consumer.js";

// Значение в transient scope: каждый resolve создаёт новый instance.
const c = container as any;
c.bind(Value, () => new Value()).inTransientScope();

async function main() {
  const a = await c.resolve(Consumer);
  const b = await c.resolve(Consumer);
  console.log("transient ids differ:", a.id !== b.id);
}

main();
export {};
