import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

export interface EnvConfig {
  webBaseUrl: string;
  apiBaseUrl: string;
  timeout: number;
  browserstack: { user: string; key: string; app: string; project: string };
}

const ROOT = process.cwd();

function resolve(value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, resolve(v)]),
    );
  }
  if (typeof value === 'string' && value === value.toUpperCase() && value.length > 1) {
    return process.env[value] ?? value;
  }
  return value;
}

export function loadEnv(env = process.env.ENV ?? 'qa'): EnvConfig {
  const file = path.join(ROOT, 'data', 'environments', `${env}.json`);
  if (!fs.existsSync(file)) throw new Error(`Environment not found: ${file}`);
  return resolve(JSON.parse(fs.readFileSync(file, 'utf8'))) as EnvConfig;
}
