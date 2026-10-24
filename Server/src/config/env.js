import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url().or(z.string().startsWith('postgresql://')),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('debug'),
  /*
   * Required, deliberately, with no default.
   *
   * The browser never sends an Authorization header - the api client is
   * withCredentials and nothing else - so the session lives entirely in the
   * auth_token cookie, and `authenticate` only reads that cookie when this
   * is 'true'. Left unset, every single thing about the server looks healthy:
   * it boots, it serves, login returns 200 and sets the cookie. Then every
   * request after it answers 401, because nothing ever looks at the cookie
   * that was just set. There is nothing in the logs to point at.
   *
   * A default would hide that. Refusing to start names it in one line.
   */
  USE_COOKIES: z.enum(['true', 'false'], {
    /*
     * zod 4 takes a single `error` callback. The v3 required_error /
     * invalid_type_error pair is accepted silently and then ignored, which
     * leaves the default 'Invalid option: expected one of "true"|"false"' -
     * accurate, and no help at all to somebody who does not know what this
     * setting is for.
     */
    error: (issue) =>
      issue.input === undefined
        ? "USE_COOKIES is not set. The browser signs in with a cookie and never sends an Authorization header, so this must be 'true' or nobody stays logged in."
        : "USE_COOKIES must be the string 'true' or 'false'.",
  }),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false'),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  EMAIL_HOST: z.string().default('smtp.gmail.com'),
  EMAIL_PORT: z.coerce.number().int().positive().default(587),
  EMAIL_USER: z.string().default(''),
  EMAIL_PASS: z.string().default(''),
  EMAIL_FROM: z.string().default('noreply@yourdomain.com'),
  EMAIL_DISABLE: z.enum(['true', 'false']).default('false'),
  ADMIN_EMAIL: z.string().email().default('admin@example.com'),
  ADMIN_PASSWORD: z.string().min(8).default('Admin@123456'),
  R2_ENDPOINT: z.string().url().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  const errors = parsed.error.flatten().fieldErrors;
  for (const [key, msgs] of Object.entries(errors)) {
    console.error(`  ${key}: ${msgs?.join(', ')}`);
  }
  process.exit(1);
}

export const env = parsed.data;
