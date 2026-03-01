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

/**
 * Validates MongoDB URI format and content before attempting connection
 * Catches common mistakes like unresolved placeholders, empty values, etc.
 */
function validateMongoDBURI(uri: string): { valid: boolean; error?: string } {
  // Check: Starts with correct protocol
  if (!uri.startsWith('mongodb+srv://') && !uri.startsWith('mongodb://')) {
    return {
      valid: false,
      error: `Invalid MONGODB_URI format. Must start with 'mongodb+srv://' or 'mongodb://'. Got: ${uri.substring(0, 50)}...`
    };
  }

  // Check: No unresolved placeholders
  const placeholderPatterns = ['<cluster>', '<username>', '<password>', '<.xxxxx.>', '._mongodb._tcp.'];
  for (const pattern of placeholderPatterns) {
    if (uri.includes(pattern)) {
      return {
        valid: false,
        error: `❌ MONGODB_URI contains unresolved placeholder: "${pattern}"\n` +
          `   You likely copied the connection string template without filling in real values.\n` +
          `   \n` +
          `   How to fix:\n` +
          `   1. Go to MongoDB Atlas: https://cloud.mongodb.com\n` +
          `   2. Click your Cluster → Connect → Drivers → Node.js\n` +
          `   3. Copy the FULL connection string (with real username, password, cluster values)\n` +
          `   4. Update Railway Variables with the correct connection string\n` +
          `   \n` +
          `   Example correct format:\n` +
          `   mongodb+srv://user123:pass456@cluster0.abc123.mongodb.net/hackshield?retryWrites=true&w=majority`
      };
    }
  }

  // Check: Has authentication
  if (!uri.includes('@')) {
    return {
      valid: false,
      error: `MONGODB_URI is missing authentication. Should contain username:password@\n` +
        `   Example: mongodb+srv://user:password@cluster0.abc123.mongodb.net/hackshield`
    };
  }

  // Check: Has MongoDB host
  if (!uri.includes('.mongodb.net') && !uri.includes('localhost')) {
    return {
      valid: false,
      error: `MONGODB_URI is missing MongoDB cluster hostname. Should contain .mongodb.net\n` +
        `   Example: mongodb+srv://user:password@cluster0.abc123.mongodb.net/hackshield`
    };
  }

  return { valid: true };
}

async function connectDB(): Promise<typeof mongoose> {
  // read the connection string inside the function so that importing this
  // module on a build server without env vars doesn't immediately blow up.
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

  // Validate URI format before attempting connection
  const validation = validateMongoDBURI(MONGODB_URI);
  if (!validation.valid) {
    console.error('\n' + '='.repeat(100));
    console.error('🚨 MONGODB_URI VALIDATION FAILED');
    console.error('='.repeat(100));
    console.error('\n' + validation.error + '\n');
    console.error('='.repeat(100) + '\n');
    throw new Error(`Invalid MONGODB_URI: ${validation.error}`);
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
          `MongoDB connection failed: Unable to resolve hostname.\n` +
          `This usually means:\n` +
          `  1. Cluster name in connection string is misspelled or doesn't exist\n` +
          `  2. Cluster is paused in MongoDB Atlas (try resuming it)\n` +
          `  3. Cluster was deleted\n` +
          `\n` +
          `Connection string: ${MONGODB_URI.substring(0, 60)}...\n` +
          `\n` +
          `Action: Verify your MONGODB_URI by copying it fresh from MongoDB Atlas Connect menu.`
        );
      }
      
      if (errorMessage.includes('ECONNREFUSED')) {
        throw new Error(
          `MongoDB connection refused.\n` +
          `Check that:\n` +
          `  1. MongoDB cluster is running (not paused in Atlas)\n` +
          `  2. Network Access whitelist allows your IP (add 0.0.0.0/0 in Atlas for testing)`
        );
      }
      
      if (errorMessage.includes('unauthorized') || errorMessage.includes('auth failed')) {
        throw new Error(
          `MongoDB authentication failed.\n` +
          `Check that username and password in MONGODB_URI are correct.\n` +
          `Note: Some characters in passwords need URL encoding (e.g., @ becomes %40)`
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
