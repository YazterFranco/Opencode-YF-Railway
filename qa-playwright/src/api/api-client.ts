import { APIRequestContext, APIResponse, request } from '@playwright/test';
import { loadEnv } from '../config/env';

export class ApiClient {
  private constructor(private readonly ctx: APIRequestContext) {}

  static async create(): Promise<ApiClient> {
    const env = loadEnv();
    const ctx = await request.newContext({
      baseURL: env.apiBaseUrl,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.API_TOKEN ?? ''}`,
      },
      timeout: env.timeout,
    });
    return new ApiClient(ctx);
  }

  async get(path: string): Promise<APIResponse> {
    return this.ctx.get(path);
  }

  async post(path: string, data: unknown): Promise<APIResponse> {
    return this.ctx.post(path, { data });
  }

  async put(path: string, data: unknown): Promise<APIResponse> {
    return this.ctx.put(path, { data });
  }

  async delete(path: string): Promise<APIResponse> {
    return this.ctx.delete(path);
  }

  async dispose(): Promise<void> {
    await this.ctx.dispose();
  }
}
