# AI Agents Guide

Этот файл является короткой точкой входа для AI-агентов. Подробные правила находятся в корневом `AGENTS.md`.

## Быстрый чек-лист

1. Прочитать `AGENTS.md`.
2. Понять задачу и затронутые модули.
3. Внести минимальное изменение.
4. Обновить docs при изменении API/поведения.
5. Запустить typecheck, build, tests.
6. Проверить examples при изменениях transform/plugin.

## Приоритеты

- Correctness > features.
- Security > convenience.
- Explicit behavior > implicit magic.
- Tests over assumptions.

## Если не уверен

- Сохраняй no-decorator архитектуру.
- Используй явные bindings.
- Добавляй тесты, а не меняй старые под новый результат.
- Останавливай build при неоднозначности, а не silently fallback.
