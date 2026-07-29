import { Hono } from 'hono';
import { requireAuth } from '../middleware/requireAuth.js';
import * as tenantApiConfigService from '../services/tenantApiConfigService.js';
import { SUPPORTED_PROVIDERS } from '../aiRouter/providerFactory.js';
import { HttpError } from '../httpError.js';

const apiConfig = new Hono();
apiConfig.use('*', requireAuth);

apiConfig.get('/keys', async (c) => {
  const keys = await tenantApiConfigService.listTenantKeys(c.env, c.executionCtx, c.get('tenantId'));
  return c.json({ providers: SUPPORTED_PROVIDERS, keys });
});

apiConfig.post('/keys', async (c) => {
  const { provider, apiKey } = await c.req.json();
  if (!provider || !apiKey) throw new HttpError('provider and apiKey are required', 400, 'MISSING_FIELDS');
  const result = await tenantApiConfigService.saveTenantKey(c.env, c.executionCtx, c.get('tenantId'), provider, apiKey);
  return c.json(result, 201);
});

apiConfig.patch('/keys/:provider', async (c) => {
  const { isActive } = await c.req.json();
  const result = await tenantApiConfigService.toggleTenantKey(c.env, c.executionCtx, c.get('tenantId'), c.req.param('provider'), !!isActive);
  return c.json(result);
});

apiConfig.delete('/keys/:provider', async (c) => {
  const result = await tenantApiConfigService.deleteTenantKey(c.env, c.executionCtx, c.get('tenantId'), c.req.param('provider'));
  return c.json(result);
});

export default apiConfig;
