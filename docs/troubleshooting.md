# Диагностика проблем

## `Async DI: no implementation found`

Проверьте:

- класс использует `implements Interface`;
- файл находится внутри `root`;
- интерфейс и реализация связаны импортом корректно;
- реализация не лежит в output/declaration каталоге.

## `Async DI: multiple implementations`

Есть несколько классов, реализующих один интерфейс. Решения:

- убрать лишнюю реализацию;
- привязать нужную явно через `container.bind`;
- резолвить конкретный класс.

## `Async DI: no implementation index`

Нужен index, то есть plugin должен выполнить `scanImplementations`. Убедитесь, что transform запущен через Vite plugin, а не напрямую без index.

## `resolve<T>() must be transformed`

Factory не была применения transform. Проверьте:

- файл попадает под `include`;
- файл не исключён `exclude`;
- plugin подключён в Vite config;
- transform не упал earlier.

## Circular dependency

Проверьте пару:

```ts
container.bind(A, async (c) => new A(await c.resolve(B)));
container.bind(B, async (c) => new B(await c.resolve(A)));
```

Разорвите цикл:

- lazy factory;
- более узкий интерфейс;
- ручная инициализация одной зависимости.

## Dependencies not injected

Если конструктор не трансформируется:

- тип параметра примитив;
- параметр имеет не поддерживаемый тип;
- parser не смог прочитать класс;
- класс уже имеет generated factory.

## Factory returns undefined

Factory не передана или передана некорректно. Убедитесь, что `bind(token, factory)` получает factory.

## Scoped instance leaks

Проверьте, что созданный scope реально используется для всех зависимых resolves. Если singleton binding owner другой, экземпляр может быть общим.
