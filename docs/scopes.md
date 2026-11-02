# Области видимости

## Когда выбирать singleton

Используйте singleton для:

- конфигурации;
- кэшей;
- stateless-сервисов;
- внешних клиентов (HTTP, БД), если они безопасны для общего использования.

```ts
container.bind(ConfigToken, () => ({ env: "production" }));
```

## Когда выбирать transient

Используйте transient для:

- объектов с изменяемым состоянием;
- request/response handlers;
- объектов, lifetime которых должен заканчиваться вместе с операцией.

```ts
container.bind(RequestContext, () => new RequestContext()).inTransientScope();
```

## Когда выбирать scoped

Используйте scoped для:

- объектов, которые должны жить в рамках запроса/операции;
- кэшей внутри одной операции;
- зависимостей, которые должны быть общими только внутри одного scope.

```ts
const scope = container.createScope("request");
const service = await scope.resolve(Service);
```

## Наследование

Дочерний контейнер видит bindings родителя. Singleton binding owner остаётся родитель, поэтому все дочерние scope получат один экземпляр.

```ts
const root = new Container("root");
root.bind(A, () => new A());

const scopeA = root.createScope("a");
const scopeB = root.createScope("b");

const instanceA = await scopeA.resolve(A);
const instanceB = await scopeB.resolve(A);

instanceA === instanceB; // true
```

## Isolation scoped

```ts
root.bind(A, () => new A()).inScopedScope();

const scopeA = root.createScope("a");
const scopeB = root.createScope("b");

const instanceA = await scopeA.resolve(A);
const instanceB = await scopeB.resolve(A);

instanceA !== instanceB; // true
```

## Parallel async

Runtime хранит promise во время фабрики. Если один и тот же token разрешается параллельно, оба вызова получат один promise, пока фабрика не завершится. Это защищает от двойного создания.

## Практическая рекомендация

- UI/global: singleton;
- request/unit of work: scoped;
- временные доменные объекты: transient.
