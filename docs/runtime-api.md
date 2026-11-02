# Runtime API

Runtime импортируется из `silentwire/runtime` или из собранного пакета.

```ts
import {
  container,
  createToken,
  Container,
  CircularDependencyError,
} from "silentwire/runtime";
```

## `createToken<T>(description)`

Создаёт типобезопасный токен. Полезно для конфигурации, примитивов, функций и объектов, которые не представлены классами.

```ts
const token = createToken<{ env: string }>("Config");
```

## `container.bind(token, factory?)`

Регистрирует фабрику. Если factory не передана, фабрика возвращает `undefined`.

```ts
container.bind(token, () => ({ env: "production" }));
```

Factory может быть функцией или классом:

```ts
container.bind(Logger, Logger);
```

Для класса runtime сначала ищет `Symbol.for("async-di:create")`, который добавляет plugin. Если его нет, создаётся `new Logger()`.

## Области видимости

```ts
container.bind(Service, (c) => new Service(c)).inSingletonScope();
container.bind(Service, (c) => new Service(c)).inTransientScope();
container.bind(Service, (c) => new Service(c)).inScopedScope();
```

### Singleton

По умолчанию. Один экземпляр на владельца binding. При разрешении из дочернего контейнера, если binding унаследован, экземпляр будет общим с parent.

### Transient

Новый экземпляр при каждом успешном resolve. Параллельные resolve до завершения получают один promise.

### Scoped

Один экземпляр на контейнер, с которого начато разрешение. Родительский и соседние scope не делят экземпляр.

## `container.resolve<T>(token?)`

Разрешает токен. Transform должен превратить `container.resolve<Foo>()` в `container.resolve(ConcreteType)`. Если токен не передан, runtime завершается ошибкой: это значит, что transform не сработал.

```ts
const value = await container.resolve(token);
```

## `container.createScope(name?)`

Создаёт дочерний контейнер.

```ts
const scope = container.createScope("request");
```

## `container.clearCache(token?)`

Очищает кэш текущего контейнера и дочерних. Без аргумента очищает весь кэш.

```ts
container.clearCache(Service);
```

## `CircularDependencyError`

Выбрасывается при обнаружении циклической зависимости.

```ts
try {
  await container.resolve(A);
} catch (error) {
  if (error instanceof CircularDependencyError) {
    console.error(error.path);
  }
}
```

## Поведение при ошибках factory

Если factory выбрасывает ошибку:

- Закешированный promise удаляется.
- Следующий resolve повторяет factory.
- Для transient cache очищается после завершения.

## Повторная регистрация

Повторный `bind()` того же токена заменяет binding и очищает кэш токена в текущем и дочерних контейнерах.
