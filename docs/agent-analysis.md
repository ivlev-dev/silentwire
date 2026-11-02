# Анализ проекта и roadmap

## Текущее состояние

Проект представляет собой компилируемый DI для Vite: scanner, transform, Vite plugin и runtime container. Тесты проходят, сборка успешна, npm audit чист.

## Сильные стороны

- Разделение scanner / transform / plugin / runtime.
- Compile-time инжекция фабрик.
- Async runtime со scopes.
- Root/scanner security.
- Бенчмарки и тесты edge-cases.

## Улучшения, уже внесённые в runtime

- Исправлен circular dependency path.
- bind очищает cache.
- scanner пропускает output/declaration файлы.
- packaging/DX улучшен.
- убрано misleading упоминание @inject.

## Roadmap

### P0

- Исключать dist/build из scanner.
- Инвалидировать cache при bind.
- Улучшать diagnostics.
- Исправлять runtime class detection.

### P1

- `resolveAll` / tagged bindings.
- Optional/generic dependencies.
- Barrel/re-export support.
- Lifecycle hooks.
- Type-safe container API.

### P2

- Package hygiene, CI, lint, type tests.
- Разбиение transform.
- Документация и examples.

## Оценка

- Архитектура: 8/10
- Transform reliability: 6/10
- Runtime: 7.5/10
- Tests: 7/10
- Docs: 7/10
- Packaging: 6.5/10
