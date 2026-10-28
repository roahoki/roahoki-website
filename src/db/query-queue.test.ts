import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { queueQueries } from "./query-queue";

/**
 * El transaction pooler de Supabase se cuelga si una conexión recibe dos
 * queries a la vez (ver `query-queue.ts`). El Postgres local no se cuelga, así
 * que la garantía se prueba con un cliente falso que cuenta cuántas queries
 * corren al mismo tiempo; contra la base de test se prueba que drizzle sigue
 * funcionando igual por encima de la fila.
 */

type Call = { text: string; asValues: boolean };

/** Un cliente con la forma de postgres.js que tarda un poco en cada query. */
function fakeClient() {
  const calls: Call[] = [];
  let running = 0;
  let peak = 0;

  function respond(call: Call) {
    calls.push(call);
    running++;
    peak = Math.max(peak, running);
    return new Promise<unknown>((resolve, reject) =>
      setTimeout(() => {
        running--;
        if (call.text === "falla") reject(new Error("falló la query"));
        else resolve(call.asValues ? [[call.text]] : [{ text: call.text }]);
      }, 5),
    );
  }

  const client = {
    // Igual que postgres.js: la query sale recién al esperarla.
    unsafe(text: string) {
      let asValues = false;
      const query = {
        values() {
          asValues = true;
          return query;
        },
        // biome-ignore lint/suspicious/noThenProperty: imita el thenable de postgres.js
        then(
          onFulfilled: (v: unknown) => unknown,
          onRejected: (e: unknown) => unknown,
        ) {
          return respond({ text, asValues }).then(onFulfilled, onRejected);
        },
      };
      return query;
    },
    async begin(
      callback: (tx: {
        run: (t: string) => Promise<unknown>;
      }) => Promise<unknown>,
    ) {
      const tx = { run: (text: string) => respond({ text, asValues: false }) };
      await respond({ text: "begin", asValues: false });
      const result = await callback(tx);
      await respond({ text: "commit", asValues: false });
      return result;
    },
    options: { parsers: {} },
  };

  return {
    client: queueQueries(client as unknown as Sql),
    calls,
    peak: () => peak,
  };
}

describe("fila de queries", () => {
  it("con Promise.all, nunca corren dos queries a la vez", async () => {
    const { client, peak, calls } = fakeClient();

    const results = await Promise.all(
      ["a", "b", "c", "d", "e"].map((text) => client.unsafe(text)),
    );

    expect(peak()).toBe(1);
    expect(calls.map((c) => c.text)).toEqual(["a", "b", "c", "d", "e"]);
    expect(results).toEqual([
      [{ text: "a" }],
      [{ text: "b" }],
      [{ text: "c" }],
      [{ text: "d" }],
      [{ text: "e" }],
    ]);
  });

  it("respeta .values(), que es como drizzle pide las filas", async () => {
    const { client, calls } = fakeClient();

    const rows = await client.unsafe("x").values();

    expect(rows).toEqual([["x"]]);
    expect(calls).toEqual([{ text: "x", asValues: true }]);
  });

  it("no manda la query hasta que alguien la espera", async () => {
    const { client, calls } = fakeClient();

    const pending = client.unsafe("tarde");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(calls).toEqual([]);

    await pending;
    expect(calls).toHaveLength(1);
  });

  it("una query que falla no traba las siguientes", async () => {
    const { client } = fakeClient();

    const [failed, next] = await Promise.allSettled([
      client.unsafe("falla"),
      client.unsafe("sigue"),
    ]);

    expect(failed.status).toBe("rejected");
    expect(next).toEqual({ status: "fulfilled", value: [{ text: "sigue" }] });
  });

  it("una transacción ocupa la fila hasta terminar", async () => {
    const { client, calls, peak } = fakeClient();

    await Promise.all([
      client.begin(async (sql) => {
        // El cliente falso le pasa a la transacción un `tx` con `run`.
        const tx = sql as unknown as { run: (t: string) => Promise<unknown> };
        await tx.run("dentro 1");
        await tx.run("dentro 2");
      }),
      client.unsafe("después"),
    ]);

    expect(peak()).toBe(1);
    expect(calls.map((c) => c.text)).toEqual([
      "begin",
      "dentro 1",
      "dentro 2",
      "commit",
      "después",
    ]);
  });

  it("deja pasar el resto del cliente (drizzle ajusta sus parsers)", () => {
    const { client } = fakeClient();

    expect(client.options).toEqual({ parsers: {} });
  });
});

const TEST_URL = process.env.TEST_DATABASE_URL;

describe.skipIf(!TEST_URL)("fila de queries con drizzle y Postgres", () => {
  const connection = postgres(TEST_URL ?? "", { prepare: false, max: 1 });
  const db = drizzle(queueQueries(connection), { casing: "snake_case" });

  afterAll(() => connection.end({ timeout: 1 }));

  it("Promise.all, execute y transacciones funcionan igual", async () => {
    const [a, b] = await Promise.all([
      db.execute<{ n: number }>("select 1::int as n"),
      db.execute<{ n: number }>("select 2::int as n"),
    ]);
    expect([a[0]?.n, b[0]?.n]).toEqual([1, 2]);

    const inside = await db.transaction(async (tx) => {
      const [row] = await tx.execute<{ n: number }>("select 3::int as n");
      return row?.n;
    });
    expect(inside).toBe(3);
  });

  it("si la transacción falla, revierte y la fila sigue", async () => {
    await expect(
      db.transaction(async (tx) => {
        await tx.execute("select 1");
        throw new Error("algo salió mal");
      }),
    ).rejects.toThrow("algo salió mal");

    const [row] = await db.execute<{ n: number }>("select 4::int as n");
    expect(row?.n).toBe(4);
  });
});
