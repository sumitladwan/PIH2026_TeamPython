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

  // Validate MongoDB URI format
  if (!MONGODB_URI.startsWith('mongodb+srv://') && !MONGODB_URI.startsWith('mongodb://')) {
    throw new Error(
      `Invalid MONGODB_URI format. Must start with 'mongodb+srv://' or 'mongodb://'. ` +
      `Got: ${MONGODB_URI.substring(0, 50)}...`
    );
  }

  // Check for unresolved placeholders
  if (MONGODB_URI.includes('<') || MONGODB_URI.includes('>')) {
    throw new Error(
      `MONGODB_URI contains unresolved placeholders. Replace <username>, <password>, <cluster> with actual values. ` +
      `Example: mongodb+srv://user:pass@cluster0.abc123.mongodb.net/hackshield`
    );
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
    }).catch((err) => {
      // Provide better error messages for common connection issues
      const errorMessage = err.message || '';
      
      if (errorMessage.includes('EBADNAME') || errorMessage.includes('getaddrinfo')) {
        throw new Error(
          `MongoDB connection failed: Unable to resolve hostname. ` +
          `This usually means the cluster name in your connection string is invalid or the cluster no longer exists. ` +
          `Verify your MONGODB_URI is correct: ${MONGODB_URI.substring(0, 50)}...`
        );
      }
      
      if (errorMessage.includes('ECONNREFUSED')) {
        throw new Error(
          `MongoDB connection refused. Check that: ` +
          `1. MongoDB cluster is running (not paused in Atlas) ` +
          `2. Network Access allows your IP (0.0.0.0/0 or specific IP)`
        );
      }
      
      if (errorMessage.includes('unauthorized') || errorMessage.includes('auth failed')) {
        throw new Error(
          `MongoDB authentication failed. ` +
          `Check that username and password in MONGODB_URI are correct.`
        );
      }
      
      throw err;
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
