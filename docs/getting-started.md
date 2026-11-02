# Быстрый старт

## 1. Создайте проект Vite

```bash
npm create vite@latest my-app -- --template vanilla-ts
cd my-app
npm install silentwire
```

## 2. Подключите plugin

`vite.config.ts`:

```ts
import { defineConfig } from "vite";
import { asyncDiPlugin } from "silentwire/vite";

export default defineConfig({
  plugins: [asyncDiPlugin()],
});
```

## 3. Добавьте интерфейс

`src/store.ts`:

```ts
export interface Store {
  get(key: string): string;
}
```

## 4. Добавьте реализацию

`src/memory-store.ts`:

```ts
import { Store } from "./store";

// Этот класс будет найден scanner по `implements Store`.
export class MemoryStore implements Store {
  get(key: string) {
    return `mem:${key}`;
  }
}
```

Важно: реализация должна импортировать или находиться в одном модуле с интерфейсом, чтобы scanner мог построить токен корректно.

## 5. Добавьте сервис

`src/service.ts`:

```ts
import type { Store } from "./store";

export class Service {
  // Зависимость выражена типом конструктора.
  constructor(private readonly store: Store) {}

  async read() {
    return this.store.get("x");
  }
}
```

## 6. Вызовите контейнер

`src/main.ts`:

```ts
import { container } from "silentwire/runtime";
import type { Service } from "./service";

async function main() {
  const service = await container.resolve<Service>();
  console.log(await service.read());
}

main();
```

## Что происходит на этапе сборки

1. `scanImplementations(root)` строит индекс `Store -> MemoryStore`.
2. Transform находит `Service`, создаёт `static async [Symbol.for("silentwire:create")]`.
3. Transform заменяет `container.resolve<Service>()` на `container.resolve(MemoryStore)` или динамический import.
4. Runtime вызывает фабрику `Service` и разрешает `MemoryStore`.

## Если реализация не находится

Трансформация завершится ошибкой сборки. Проверьте:

- класс реально использует `implements Store`;
- файл лежит внутри `root`;
- класс не попал в skipped/output каталог;
- нет нескольких реализаций одного интерфейса без явной привязки.
