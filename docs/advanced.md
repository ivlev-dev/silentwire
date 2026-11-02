# Продвинутые сценарии

## Qualified dependencies

Transform поддерживает вызовы вида `container.resolve<Types.Store>()`, если `Types` является namespace-import из модуля с реализацией.

```ts
import type * as Types from "./types";

export class Service {
  constructor(private readonly store: Types.Store) {}
}
```

## Автоподстановка через интерфейс

Если `MemoryStore implements Store`, plugin автоматически заменит зависимость `Store` на `MemoryStore`.

## Явная привязка

Если автоматическая связь нежелательна или невозможна, используйте runtime:

```ts
container.bind(StoreToken, () => new MemoryStore()).inSingletonScope();
```

## Разрешение конкретного класса

```ts
const service = await container.resolve(Service);
```

## Токены для нетиповых значений

`createToken` подходит для конфигурации и фабрик:

```ts
const LoggerToken = createToken<Logger>("Logger");

container.bind(LoggerToken, () => console);
```

## Несколько реализаций одного интерфейса

Если реализации несколько, transform остановит сборку с ошибкой. Варианты решения:

1. Разделить интерфейсы.
2. Использовать distinct token для каждой реализации.
3. Сделать явную привязку в composition root.
4. Резолвить нужный конкретный класс напрямую.

## Баррели и re-export

Scanner читает импорты локально. Сложные barrel/re-export сценарии могут потребовать явной привязки или адаптации scanner. При проектировании проекта держите реализации и интерфейсы предсказуемо связанными через прямые relative import.

## Типы, которые сейчас ограничены

- generic type arguments в зависимостях;
- union/intersection зависимости;
- optional parameters как optional dependencies;
- default parameter values в generated factory.

Эти сценарии можно покрыть ручной binding-логикой.

## Default values

Если параметр имеет default:

```ts
constructor(private readonly a: A = new A()) {}
```

transform всё равно создаст `await container.resolve(A)` и default не будет использован. Это ограничение нужно учитывать.

## Трансформация resolve calls

`container.resolve<Foo>()` переписывается в `container.resolve(ConcreteFoo)` или динамический import. Это и есть compile-time DI.
