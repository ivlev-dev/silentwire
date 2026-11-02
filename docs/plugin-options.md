# Настройка плагина

## Базовая конфигурация

```ts
import { defineConfig } from "vite";
import { asyncDiPlugin } from "silentwire/vite";

export default defineConfig({
  plugins: [asyncDiPlugin()],
});
```

## Опции

```ts
asyncDiPlugin({
  include: /\.(ts|tsx|mts|cts)$/,
  exclude: /node_modules/,
  root: process.cwd(),
});
```

### `include`

RegExp, определяющий, какие файлы трансформировать. По умолчанию: `/\.(ts|tsx|mts|cts)$/`.

### `exclude`

RegExp, определяющий, какие файлы исключить. По умолчанию: `/node_modules/`.

### `root`

Корень проекта для scanner. По умолчанию `process.cwd()`.

## Как работает invalidation

В режиме разработки:

- при HMR и watch-событиях для TypeScript-файлов index инвалидируется;
- при следующем transform index строится заново;
- при build index создаётся в `buildStart`.

## Практические рекомендации

- Не указывайте `root` на generated/cache каталоги.
- Если проект использует monorepo, указывайте root пакета, где лежат реализации.
- `exclude` полезен для generated-файлов, где transform не нужен.

## Пример для monorepo

```ts
export default defineConfig({
  plugins: [
    asyncDiPlugin({
      root: process.cwd(),
      exclude: /node_modules|generated/,
    }),
  ],
});
```
