require('dotenv').config();

function bool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 4000),
  APP_URL: process.env.APP_URL || 'http://localhost:4000',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 4000),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'fanchatbot',
    ssl: bool(process.env.DB_SSL, false),
  },

  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  manusOAuth: {
    clientId: process.env.MANUS_OAUTH_CLIENT_ID || '',
    clientSecret: process.env.MANUS_OAUTH_CLIENT_SECRET || '',
    redirectUri: process.env.MANUS_OAUTH_REDIRECT_URI || '',
  },

  // Platform-owned test/admin keys — see .env.example for the full
  // explanation of when (if ever) these are used for tenant traffic.
  platformTestKeys: {
    openai: process.env.OPENAI_TEST_KEY || '',
    gemini: process.env.GEMINI_TEST_KEY || '',
    manus: process.env.MANUS_TEST_KEY || '',
    groq: process.env.GROQ_TEST_KEY || '',
    xai: process.env.XAI_KEY || '',
  },
  allowPlatformTrialKey: bool(process.env.ALLOW_PLATFORM_TRIAL_KEY, false),

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
    max: Number(process.env.RATE_LIMIT_MAX || 100),
  },
};

/**
 * Fails fast and loudly on missing critical config instead of limping
 * along and producing a confusing runtime error three layers deep.
 */
function assertRequiredEnv() {
  const missing = [];
  if (!process.env.ENCRYPTION_MASTER_KEY) missing.push('ENCRYPTION_MASTER_KEY');
  if (!env.jwt.secret) missing.push('JWT_SECRET');

  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error(
      `\nMissing required environment variables: ${missing.join(', ')}\n` +
        'Copy .env.example to .env and fill these in (see `npm run generate:key` for ENCRYPTION_MASTER_KEY).\n'
    );
    process.exit(1);
  }
}

module.exports = { env, assertRequiredEnv };
