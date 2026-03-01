import mongoose from 'mongoose';

// The connection function reads the environment variable at runtime rather
// than at module initialization.  During the Next.js build process we import
// API route modules to collect metadata, which previously triggered the
// top‑level check and threw an error if MONGODB_URI was undefined.  That
// caused `next build` to fail on Railway when environment variables hadn't
// yet been configured.  Moving the lookup into `connectDB` defers the check
// until the function is actually invoked on the server, avoiding build-time
// failures while still enforcing the requirement at runtime.

interface Cached {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: Cached | undefined;
}

let cached: Cached = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectDB(): Promise<typeof mongoose> {
  // read the connection string inside the function so that importing this
  // module on a build server without env vars doesn't immediately blow up.
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('✅ MongoDB connected successfully');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
