# Примеры

Все примеры лежат в `examples/`. Они рассчитаны на чтение и запуск с корневого проекта.

## `examples/autowire`

Показывает автоподстановку реализации интерфейса:

- `a.ts` — интерфейс `A`;
- `a-impl.ts` — `AImpl implements A`;
- `b.ts` — класс `B` зависит от `A`;
- `main.ts` — resolve `B`.

Запуск:

```bash
npm run dev:example
```

Порт может быть занят; тогда Vite предложит другой.

## `examples/interfaces`

Показывает явный импорт сервиса и резолв класса напрямую.

## `examples/scopes`

Проверяет transient scope: два Consumer получают разные экземпляры `Value`.

## `examples/bootstrap`

Создаёт типизированный token через `createToken<Config>`.

## `examples/app`

Небольшое Vite-приложение с UI. Показывает, как `container.resolve<B>()` превращается в реальное приложение.

## Как изучать примеры

1. Начните с `examples/autowire`.
2. Затем `examples/interfaces`.
3. После этого `examples/scopes`.
4. Наконец `examples/app`.

## Важно

Примеры импортируют `../../src/...`, поэтому они тестировать изменения текущего репозитория, а не установленный пакет. После запуска Vite example может перезаписать корневой `dist`; поэтому после проверки снова выполните `npm run build`.
