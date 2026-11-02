import { container } from "../../src/runtime/container.js";

// Явная привязка: пример показывает ручное управление зависимостью.
import { Service } from "./service.js";

async function main() {
  const service = await (container as any).resolve(Service);
  console.log(await service.read());
}

main();
export {};
