import mongoose, { type Connection, type Model, type Schema } from "mongoose";

/**
 * MongoDB connections, scoped to where they can safely be reused.
 *
 * Cloudflare Workers forbid using a socket opened by one request from another:
 * the query just hangs until the runtime kills the request. So on Workers each
 * request gets its own connection. OpenNext runs every request inside an
 * AsyncLocalStorage whose store ({ env, ctx, cf }) is a fresh object per
 * request, exposed on this global symbol — that object is the cache key.
 * In Node (`next dev`, `next start`) there is no store, and one connection is
 * shared across requests as usual.
 */

const REQUEST_CONTEXT = Symbol.for("__cloudflare-context__");

interface RequestScope {
  ctx?: { waitUntil(promise: Promise<unknown>): void };
}

interface Entry {
  conn: Connection;
  ready: Promise<Connection>;
}

declare global {
  var _mongooseConn: Entry | undefined;
  var _mongooseIndexesSynced: boolean | undefined;
}

const schemas = new Map<string, Schema>();
const perRequest = new WeakMap<RequestScope, Entry>();

function requestScope(): RequestScope | undefined {
  return (globalThis as Record<symbol, RequestScope | undefined>)[REQUEST_CONTEXT];
}

function register(conn: Connection): void {
  // Every known model goes on every connection so populate() refs resolve.
  for (const [name, schema] of schemas) {
    if (!conn.models[name]) conn.model(name, schema);
  }
}

function open(): Entry {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to .env.local");
  }
  /* Fail fast. The driver's defaults (30s server selection, no socket
     timeout) mean an unreachable database holds a page render open long
     enough that the user gives up first — and a request that never returns
     can't render an error state or a retry. */
  const conn = mongoose.createConnection(uri, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 8_000,
    connectTimeoutMS: 8_000,
    socketTimeoutMS: 20_000,
    // Per-request connections on Workers don't need a big pool.
    ...(requestScope() ? { maxPoolSize: 5 } : {}),
  });
  register(conn);
  return { conn, ready: conn.asPromise() };
}

function current(): Entry {
  const scope = requestScope();
  if (scope) {
    let entry = perRequest.get(scope);
    if (!entry) {
      entry = open();
      perRequest.set(scope, entry);
    }
    return entry;
  }
  globalThis._mongooseConn ??= open();
  return globalThis._mongooseConn;
}

export async function connectDB(): Promise<Connection> {
  const entry = current();
  try {
    await entry.ready;
  } catch (err) {
    // Drop the failed connection so the next call retries.
    const scope = requestScope();
    if (scope) perRequest.delete(scope);
    else globalThis._mongooseConn = undefined;
    throw err;
  }

  // One-time index migration per isolate/process: WatchHistory's unique key
  // gained a `source` field; syncIndexes drops the old five-field unique index
  // that would otherwise block log+stream rows coexisting for the same title.
  if (!globalThis._mongooseIndexesSynced) {
    globalThis._mongooseIndexesSynced = true;
    const sync = import("@/models/WatchHistory")
      .then(({ WatchHistory }) => WatchHistory.syncIndexes())
      .catch(() => {
        globalThis._mongooseIndexesSynced = false;
      });
    requestScope()?.ctx?.waitUntil(sync);
  }

  return entry.conn;
}

/**
 * Defines a model whose calls (`User.findOne(...)`, `new User(...)`) go to the
 * connection for the current request. Call `await connectDB()` first.
 */
export function defineModel<T>(name: string, schema: Schema): Model<T> {
  schemas.set(name, schema);

  const resolve = (): Model<T> => {
    const { conn } = current();
    register(conn);
    return conn.models[name] as Model<T>;
  };

  return new Proxy(function () {} as unknown as Model<T>, {
    get(_target, prop) {
      const model = resolve();
      const value = Reflect.get(model, prop, model);
      return typeof value === "function" ? value.bind(model) : value;
    },
    construct(_target, args) {
      const ModelCtor = resolve() as unknown as new (...a: unknown[]) => object;
      return new ModelCtor(...args);
    },
  });
}
