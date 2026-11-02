import { container } from "../../src/runtime/container.js";

// Импорт ради побочного эффекта: регистрирует реализацию A в приложении.
import "./a-impl.js";

// B импортируется только как тип, чтобы вызвать container.resolve<B>().
import { type B } from "./b.js";

async function main() {
  // Во время сборки B получит фабрику с внедрением AImpl.
  const b = await container.resolve<B>();
  console.log(await b.use());
}

main();
export {};
