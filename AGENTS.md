# AGENTS.md — инструкции для AI-агентов

## Назначение

Этот файл содержит правила для AI-агентов, работающих с репозиторием `async-di`. Он нужен для безопасных и консистентных изменений кода.

## Общие принципы

- Не добавляйте декораторы как основной механизм DI. Проект ориентирован на compile-time transform без декораторов.
- Предпочитайте явные bindings, tokens и concrete-class resolution.
- Сохраняйте совместимость public API из `src/index.ts`, `src/plugin.ts`, `src/runtime/*`.
- Проверяйте изменения через `npm run build`, `npm run typecheck`, `npm test`.
- Изменения документации должны соответствовать реальному поведению кода.

## Карта репозитория

- `src/scanner.ts` — обход файлов и построение индекса interface → implementation.
- `src/transform.ts` — Babel AST transform конструкторов и `resolve<T>()`.
- `src/plugin.ts` — Vite plugin lifecycle и инвалидация index.
- `src/runtime/container.ts` — runtime container, scopes, cache, errors.
- `src/utils.ts` — canonical paths, root checks, JSON string escape.
- `tests/` — unit/bench tests.
- `examples/` — учебные примеры.
- `docs/` — документация на русском.

## Команды

```bash
npm run build
npm run typecheck
npm test
npm run bench
npm run audit
npm run dev:example
```

## Важные инварианты

1. Transform не должен молча откатываться к исходному коду при ожидаемой ошибке разрешения. Лучше fail build.
2. Scanner должен оставаться внутри `root` и не следовать симлинкам.
3. Output/build каталоги и declaration files не должны сканироваться.
4. Runtime singleton должен делиться корректно между родителем и scope.
5. Ошибка factory должна очищать cache.
6. Circular dependency detection должен находить циклы.
7. Generated dynamic imports обязаны экранировать пути через `jsString`.

## Правила изменения кода

- Используйте TypeScript strict.
- Предпочитайте минимальные изменения public API.
- Не ослабляйте тесты; добавляйте тесты для нового поведения.
- Исключайте `any`, где это не усложняет Babel integration чрезмерно.
- Обновляйте README/docs при изменении поведения.
- Проверяйте examples после изменений transform/plugin.

## Тестирование

Перед завершением задачи выполните:

```bash
npm run typecheck
npm run build
npm test
```

Для изменений scanner/transform дополнительно проверьте:

```bash
npx vite build --config examples/app/vite.config.ts
```

После этой команды не забудьте `npm run build`, так как пример перезапишет `dist`.

## Документация для AI-агентов также находится в

- `docs/ai-agents.md`
- `docs/agent-analysis.md`
- `docs/troubleshooting.md`
- `docs/advanced.md`

## Что нельзя делать

- Не удаляйте security checks scanner без причины.
- Не changing `root` defaults silently.
- Не превращайте multiple implementations в silent first-match.
- Не меняйте semantics scope без обновления tests/docs.
- Не коммитьте generated `dist` вручную, если он может быть восстановлен build.
