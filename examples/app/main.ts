import { container } from "../../src/runtime/container.js";

// Импортируется только как тип: на runtime эта строка не создаёт зависимость.
import type { B } from "./../autowire/b.js";

async function run() {
  const out = document.getElementById("out");
  try {
    // Контейнер разрешает B. Во время сборки silentwire подставит реализацию A.
    const b = await container.resolve<B>();
    out!.textContent = await (b as any).use();
  } catch (error) {
    out!.textContent = `ERROR: ${String(error)}`;
    console.error(error);
  }
}

run();
export {};
