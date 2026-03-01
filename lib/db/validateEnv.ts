import { NextRequest, NextResponse } from 'next/server';

/**
 * Validation middleware for critical environment variables
 * Runs on every request to API routes and immediately fails if config is invalid
 */
export async function validateEnvironment(req: NextRequest) {
  const mongodb_uri = process.env.MONGODB_URI;
  
  // Check 1: Variable exists
  if (!mongodb_uri) {
    console.error('❌ MONGODB_URI is not defined');
    return NextResponse.json(
      {
        error: 'Server Configuration Error',
        message: 'MONGODB_URI environment variable is not set',
        action: 'Define MONGODB_URI in Railway environment variables or .env.local'
      },
      { status: 500 }
    );
  }

  // Check 2: Valid protocol
  if (!mongodb_uri.startsWith('mongodb+srv://') && !mongodb_uri.startsWith('mongodb://')) {
    console.error('❌ Invalid MONGODB_URI format');
    return NextResponse.json(
      {
        error: 'Server Configuration Error',
        message: 'MONGODB_URI has invalid format. Must start with mongodb+srv:// or mongodb://',
        received: mongodb_uri.substring(0, 50) + '...',
        example: 'mongodb+srv://username:password@cluster0.abc123.mongodb.net/hackshield'
      },
      { status: 500 }
    );
  }

  // Check 3: No unresolved placeholders
  const placeholders = ['<cluster>', '<username>', '<password>', '<.xxxxx.>'];
  for (const placeholder of placeholders) {
    if (mongodb_uri.includes(placeholder)) {
      console.error(`❌ MONGODB_URI contains unresolved placeholder: ${placeholder}`);
      return NextResponse.json(
        {
          error: 'Server Configuration Error',
          message: `MONGODB_URI contains unresolved placeholder: ${placeholder}`,
          action: 'Copy the connection string directly from MongoDB Atlas Connect → Drivers → Node.js',
          current: mongodb_uri.substring(0, 60) + '...',
          example: 'mongodb+srv://user123:pass456@cluster0.abc123.mongodb.net/hackshield?retryWrites=true&w=majority'
        },
        { status: 500 }
      );
    }
  }

  // Check 4: Contains expected parts
  if (!mongodb_uri.includes('@') || !mongodb_uri.includes('.mongodb.net')) {
    console.error('❌ MONGODB_URI is missing required components');
    return NextResponse.json(
      {
        error: 'Server Configuration Error',
        message: 'MONGODB_URI is incomplete. Missing authentication or cluster host',
        example: 'mongodb+srv://user:password@cluster.mongodb.net/database'
      },
      { status: 500 }
    );
  }

  return null; // Validation passed
}

export default validateEnvironment;
