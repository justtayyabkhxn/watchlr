import mongoose from "mongoose";

/**
 * Cached Mongoose connection for serverless environments.
 * Route handlers and server components share one connection per
 * warm lambda instead of opening a new one on every invocation.
 */

declare global {
  var _mongoose:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
        indexesSynced?: boolean;
      }
    | undefined;
}

const cached = globalThis._mongoose ?? { conn: null, promise: null };
globalThis._mongoose = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI is not set. Add it to .env.local");
    }
    cached.promise = mongoose.connect(uri, { bufferCommands: false });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  // One-time index migration per cold start: WatchHistory's unique key gained
  // a `source` field; syncIndexes drops the old five-field unique index that
  // would otherwise block log+stream rows coexisting for the same title.
  if (!cached.indexesSynced) {
    cached.indexesSynced = true;
    const { WatchHistory } = await import("@/models/WatchHistory");
    WatchHistory.syncIndexes().catch(() => {
      cached.indexesSynced = false;
    });
  }

  return cached.conn;
}
