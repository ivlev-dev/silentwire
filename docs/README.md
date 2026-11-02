# Документация async-di

Это единая точка входа в русскоязычную документацию. Читайте её последовательно или переходите к нужному разделу.

## Быстрый маршрут

1. [Быстрый старт](./getting-started.md)
2. [Runtime API](./runtime-api.md)
3. [Scopes](./scopes.md)
4. [Продвинутые сценарии](./advanced.md)
5. [Диагностика](./troubleshooting.md)

## Разделы

| Раздел | Для кого | Содержание |
|---|---|---|
| [Быстрый старт](./getting-started.md) | Новые пользователи | Первый проект, plugin, интерфейс, реализация, resolve. |
| [Runtime API](./runtime-api.md) | Все пользователи | `bind`, `resolve`, scopes, cache, errors, tokens. |
| [Scopes](./scopes.md) | Архитектура приложения | Singleton, transient, scoped, наследование. |
| [Настройка плагина](./plugin-options.md) | Сборка/Vite | include, exclude, root, HMR, monorepo. |
| [Продвинутые сценарии](./advanced.md) | Сложные проекты | Qualified types, explicit binding, multiple implementations. |
| [Безопасность и производительность](./security-performance.md) | Production | Scanner, traversal, cache, benchmarks. |
| [Диагностика](./troubleshooting.md) | Все пользователи | Типичные ошибки и способы исправления. |
| [Примеры](./examples.md) | Обучение | Описание example-каталогов. |
| [Анализ проекта](./agent-analysis.md) | Maintainers | Оценка и roadmap. |
| [AI agents](./ai-agents.md) | AI-агенты | Правила изменения проекта. |

## Короткая справка

```ts
import { asyncDiPlugin } from "silentwire/vite";

export default defineConfig({
  plugins: [asyncDiPlugin()],
});
```

```ts
import { container } from "silentwire/runtime";
import type { Service } from "./service";

const service = await container.resolve<Service>();
```

## Минимальный checklist

- Класс реализует интерфейс через `implements`.
- Файл находится внутри `root`.
- Файл не в `dist`, `build`, `coverage`.
- Для нескольких реализаций сделана явная привязка.
- Изменения проверены через build и tests.

## Навигация

- Начало: [Быстрый старт](./getting-started.md)
- API: [Runtime API](./runtime-api.md)
- Проблемы: [Диагностика](./troubleshooting.md)
EOF