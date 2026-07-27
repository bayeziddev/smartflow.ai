const tenantApiConfigService = require('../services/tenantApiConfigService');
const { SUPPORTED_PROVIDERS } = require('../services/aiRouter/providerFactory');
const AppError = require('../utils/AppError');

// GET /api/config/keys — masked previews only, never the real key.
async function listKeys(req, res, next) {
  try {
    const keys = await tenantApiConfigService.listTenantKeys(req.tenantId);
    res.json({ providers: SUPPORTED_PROVIDERS, keys });
  } catch (err) {
    next(err);
  }
}

// POST /api/config/keys  { provider, apiKey }
// The raw apiKey is read once from the request body, encrypted, and
// never echoed back — the response contains only the masked preview.
async function saveKey(req, res, next) {
  try {
    const { provider, apiKey } = req.body;
    if (!provider || !apiKey) {
      throw new AppError('provider and apiKey are required', 400, 'MISSING_FIELDS');
    }
    const result = await tenantApiConfigService.saveTenantKey(req.tenantId, provider, apiKey);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/config/keys/:provider  { isActive }
async function toggleKey(req, res, next) {
  try {
    const { provider } = req.params;
    const { isActive } = req.body;
    const result = await tenantApiConfigService.toggleTenantKey(req.tenantId, provider, !!isActive);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/config/keys/:provider
async function deleteKey(req, res, next) {
  try {
    const { provider } = req.params;
    const result = await tenantApiConfigService.deleteTenantKey(req.tenantId, provider);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { listKeys, saveKey, toggleKey, deleteKey };
