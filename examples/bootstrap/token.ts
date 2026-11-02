import { createToken } from "../../src/runtime/container.js";

// Типизированный token для конфигурации.
interface Config {
  env: string;
}

export const ConfigToken = createToken<Config>("Config");
export type { Config };
