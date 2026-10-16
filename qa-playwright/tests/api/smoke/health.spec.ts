import { test, expect } from '@playwright/test';
import { ApiClient } from '@api/api-client';

let api: ApiClient;
test.beforeAll(async () => {
  api = await ApiClient.create();
});
test.afterAll(async () => {
  await api.dispose();
});

test.describe('API smoke @smoke @api', () => {
  test('health responde ok', async () => {
    const res = await api.get('/health');
    expect(res.status()).toBe(200);
    expect((await res.json()).status).toBe('ok');
  });

  test('listado de usuarios devuelve 200 @critical', async () => {
    const res = await api.get('/v1/users');
    expect(res.status()).toBe(200);
    expect(await res.json()).not.toHaveLength(0);
  });
});
