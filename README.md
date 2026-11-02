# silentwire

Компилируемый DI-плагин для Vite. `async-di` сканирует TypeScript-реализации, изменяет конструкторы классов и вызовы `container.resolve<T>()` во время сборки и предоставляет небольшой асинхронный runtime-контейнер.

## Установка

```bash
npm install silentwire
```

Обязательная peer-зависимость:

- `vite >= 8`

## Быстрый старт

### 1. Подключите Vite-плагин

```ts
import { defineConfig } from "vite";
import { asyncDiPlugin } from "silentwire/vite";

export default defineConfig({
  plugins: [asyncDiPlugin()],
});
```

### 2. Опишите интерфейс и реализацию

```ts
// types.ts
export interface Store {
  get(key: string): string;
}
```

```ts
// memory-store.ts
import { Store } from "./types";

export class MemoryStore implements Store {
  get(key: string) {
    return `mem:${key}`;
  }
}
```

### 3. Используйте зависимость через конструктор

```ts
// service.ts
import type { Store } from "./types";

export class Service {
  constructor(private readonly store: Store) {}

  async read() {
    return this.store.get("x");
  }
}
```

Во время сборки `async-di` найдёт `MemoryStore` как реализацию `Store`, создаст фабрику класса `Service` и подставит динамический импорт к реализации.

### 4. Разрешите объект через контейнер

```ts
import { container } from "silentwire/runtime";
import type { Service } from "./service";

const service = await container.resolve<Service>();
console.log(await service.read());
```

## Runtime API

```ts
import {
  container,
  createToken,
  CircularDependencyError,
} from "silentwire/runtime";

const token = createToken<{ env: string }>("Config");

container.bind(token, () => ({ env: "production" }));

const value = await container.resolve(token);
```

### Области видимости

```ts
container.bind(Service, (c) => new Service(c)).inTransientScope();
container.bind(Service, (c) => new Service(c)).inScopedScope();
```

Поддерживаются:

- singleton — по умолчанию, один экземпляр на владельца binding-а;
- transient — новый экземпляр при каждом успешном разрешении;
- scoped — один экземпляр в пределах контейнера, с которого началось разрешение.

### Ограничения

- Constructor transform обычно работает с конструкторами, параметры которых читаемы как простые типовые выражения. Сложные union/intersection/generic-параметры могут потребовать ручной привязки.
- Default-значения параметров не сохраняются в generated factory: factory использует зависимости через контейнер.
- Scanner строит связь интерфейс → реализация по `implements`. Сложные re-export/type-only сценарии могут потребовать явной `bind(...)`.
- Если трансформация не может однозначно определить реализацию, сборка завершается ошибкой, а не молча откатывается к исходному коду.
- При нескольких реализациях одного интерфейса выберите нужную явной привязкой или резолвом конкретного класса.

## Семантика контейнера

- Singleton хранится в контейнере-владельце binding-а. При наследовании из родительского контейнера все scope используют один экземпляр.
- Scoped хранится в контейнере, с которого началось разрешение.
- Transient не переиспользуется после успешного разрешения; параллельные resolve, выданные до завершения, получают один и тот же promise.
- Неудачная фабрика очищает закешированный promise, следующий resolve повторяет попытку.
- Циклические зависимости выбрасывают `CircularDependencyError`.
- Повторная `bind(...)` того же токена очищает кэш токена в текущем и дочерних контейнерах.

## Опции плагина

```ts
asyncDiPlugin({
  include: /\.(ts|tsx|mts|cts)$/,
  exclude: /node_modules/,
  root: process.cwd(),
});
```

- `include` — RegExp для файлов, которые нужно трансформировать.
- `exclude` — RegExp для исключения.
- `root` — корень проекта для scanner.

Регулярки с флагами `g`/`y` автоматически нормализуются, чтобы избежать проблем с `lastIndex`.

## Безопасность

- Строки динамических import экранируются через JSON.
- Scanner не выходит за пределы `root`, игнорирует симлинки и общие каталоги сборки.
- Scanner и plugin работают только с TypeScript-файлами.
- Держите `root` указанным на доверенный корень проекта.
- Scanner пропускает `node_modules`, скрытые каталоги, `dist`, `build`, `coverage` и declaration-файлы.

## Производительность

Бенчмарки:

```bash
pnpm bench
```

Scanner кэширует результат по путям файлов и их сигнатуре. В режиме разработки plugin перестраивает index при изменении TypeScript-файлов.

## Примеры

- `examples/app` — небольшое Vite-приложение.
- `examples/autowire` — автоподстановка реализации интерфейса.
- `examples/interfaces` — ручная сборка зависимости.
- `examples/scopes` — transient-области.
- `examples/bootstrap` — создание типизированного token.

## Скрипты

```bash
pnpm build
pnpm test
pnpm bench
pnpm audit
pnpm dev:example
```

## Документация

- Полная документация: [`docs/README.md`](./docs/README.md)
- Быстрый старт: [`docs/getting-started.md`](./docs/getting-started.md)
- Runtime API: [`docs/runtime-api.md`](./docs/runtime-api.md)
- Примеры: [`docs/examples.md`](./docs/examples.md)
- Правила для AI-агентов: [`AGENTS.md`](./AGENTS.md)
- Анализ и roadmap: [`docs/agent-analysis.md`](./docs/agent-analysis.md)
