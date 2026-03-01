/**
 * Server startup validation
 * This file validates critical environment variables when the server starts
 * If validation fails, the server will refuse to start
 */

const REQUIRED_ENV_VARS = {
  MONGODB_URI: {
    description: 'MongoDB connection string',
    example: 'mongodb+srv://user:password@cluster0.abc123.mongodb.net/hackshield',
    validate: (value: string) => {
      if (!value) return { valid: false, reason: 'MONGODB_URI is empty' };
      if (!value.startsWith('mongodb+srv://') && !value.startsWith('mongodb://')) {
        return { valid: false, reason: 'Must start with mongodb+srv:// or mongodb://' };
      }
      if (value.includes('<') || value.includes('>')) {
        return { valid: false, reason: 'Contains unresolved placeholders like <cluster>, <username>, <password>' };
      }
      if (!value.includes('@')) {
        return { valid: false, reason: 'Missing authentication (user:password@)' };
      }
      if (!value.includes('.mongodb.net')) {
        return { valid: false, reason: 'Missing MongoDB cluster hostname (.mongodb.net)' };
      }
      return { valid: true };
    }
  },
  NEXTAUTH_SECRET: {
    description: 'NextAuth.js secret key',
    example: 'generated-random-string',
    validate: (value: string) => {
      if (!value) return { valid: false, reason: 'NEXTAUTH_SECRET is empty' };
      if (value.length < 16) return { valid: false, reason: 'Should be at least 16 characters' };
      return { valid: true };
    }
  }
};

export function validateServerEnvironment() {
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log('\n🔍 Validating server environment variables...\n');

  for (const [varName, config] of Object.entries(REQUIRED_ENV_VARS)) {
    const value = process.env[varName];

    if (!value) {
      const msg = `❌ ${varName}: ${config.description} - NOT SET`;
      errors.push(msg);
      console.error(msg);
      continue;
    }

    const validation = config.validate(value);
    if (!validation.valid) {
      const msg = `❌ ${varName}: ${validation.reason}\n   Example: ${config.example}`;
      errors.push(msg);
      console.error(msg);
    } else {
      console.log(`✅ ${varName}: Valid`);
    }
  }

  // Optional warnings
  if (process.env.NODE_ENV === 'production') {
    if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.startsWith('https://')) {
      const msg = `⚠️  NEXTAUTH_URL should use https:// in production. Current: ${process.env.NEXTAUTH_URL}`;
      warnings.push(msg);
      console.warn(msg);
    }
  }

  console.log('');

  if (errors.length > 0) {
    console.error(`\n${'='.repeat(80)}`);
    console.error('❌ SERVER STARTUP FAILED - CONFIGURATION ERRORS');
    console.error(`${'='.repeat(80)}`);
    console.error('\nThe following environment variables have invalid values:\n');
    errors.forEach(err => console.error(err));
    console.error('\n' + '='.repeat(80) + '\n');
    
    throw new Error(
      `Critical environment variables are invalid. Server cannot start. ` +
      `Check MongoDB URI and NextAuth secret in your deployment environment.`
    );
  }

  if (warnings.length > 0) {
    console.warn(`\nWarnings (${warnings.length}):`);
    warnings.forEach(w => console.warn(w));
  }

  console.log('✅ All critical environment variables are valid\n');
}

export default validateServerEnvironment;
