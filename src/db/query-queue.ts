import type { Sql } from "postgres";

/**
 * Pone en fila las queries de un cliente de postgres.js: cada una sale recién
 * cuando la anterior terminó.
 *
 * El transaction pooler de Supabase (Supavisor, puerto 6543) se cuelga si una
 * misma conexión recibe una query mientras otra sigue en curso, y la conexión
 * queda muerta para siempre: todas las queries siguientes de esa instancia
 * esperan sin fin. postgres.js manda en paralelo por la misma conexión (con
 * `max: 1` no tiene otra), y eso pasa apenas una página hace `Promise.all`, o
 * cuando el layout y la página consultan a la vez. Probado contra producción
 * el 2026-10-28: dos queries simultáneas bastaban para colgar el panel.
 *
 * Dos alternativas descartadas:
 * - Subir `max`: solo corre el problema a más queries simultáneas que
 *   conexiones, y con Fluid compute varias requests comparten instancia.
 * - Pasar al session pooler (5432): no se cuelga, pero cada instancia retiene
 *   una conexión del pool, que es justo lo que el transaction pooler evita.
 *
 * drizzle usa solo dos métodos del cliente: `unsafe` para cada query y
 * `begin` para las transacciones. Una transacción ocupa la fila entera hasta
 * terminar; adentro las queries van por su propio cliente (`tx`), que ya es
 * secuencial. Por eso **dentro de una transacción no se puede usar `getDb()`**:
 * esperaría a que la transacción termine, y la transacción a ella.
 */
export function queueQueries<T extends Sql>(client: T): T {
  let tail: Promise<unknown> = Promise.resolve();

  function enqueue<R>(task: () => PromiseLike<R>): Promise<R> {
    const result = tail.then(task);
    // Una query que falla no corta la fila: el error le llega a quien la
    // pidió, y la siguiente sale igual.
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === "unsafe") {
        return (...args: Parameters<Sql["unsafe"]>) =>
          lazyQuery((asValues) =>
            enqueue(() => {
              const query = target.unsafe(...args);
              return asValues ? query.values() : query;
            }),
          );
      }
      if (prop === "begin") {
        return (...args: unknown[]) =>
          enqueue(() =>
            (target.begin as (...a: unknown[]) => PromiseLike<unknown>)(
              ...args,
            ),
          );
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

/**
 * Lo que devuelve `unsafe`: igual que en postgres.js, la query no sale hasta
 * que alguien la espera, porque recién ahí se sabe si se pidió `.values()`
 * (filas como arreglos, lo que usa drizzle) o filas como objetos.
 */
function lazyQuery(run: (asValues: boolean) => Promise<unknown>) {
  let started: Promise<unknown> | undefined;
  const start = (asValues: boolean) => {
    started ??= run(asValues);
    return started;
  };
  return {
    values: () => start(true),
    // biome-ignore lint/suspicious/noThenProperty: imita el thenable de postgres.js
    then: <A, B>(
      onFulfilled?: (value: unknown) => A | PromiseLike<A>,
      onRejected?: (reason: unknown) => B | PromiseLike<B>,
    ) => start(false).then(onFulfilled, onRejected),
    catch: <B>(onRejected?: (reason: unknown) => B | PromiseLike<B>) =>
      start(false).catch(onRejected),
    finally: (onFinally?: () => void) => start(false).finally(onFinally),
  };
}
