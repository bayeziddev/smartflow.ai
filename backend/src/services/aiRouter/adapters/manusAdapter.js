const axios = require('axios');
const { ProviderError } = require('./baseAdapter');

const MANUS_BASE_URL = 'https://api.manus.ai/v2';
const DEFAULT_POLL_INTERVAL_MS = 1500;
const DEFAULT_POLL_TIMEOUT_MS = 20000;

/**
 * IMPORTANT — Manus is an agent/task orchestration platform, not a
 * plain chat-completion API like the other three adapters. A task can
 * run for a while and Manus's own docs recommend webhooks for
 * production notification rather than polling. This adapter creates a
 * task and polls task.get as a best-effort way to present a
 * synchronous `complete()` interface consistent with the other
 * adapters — verify the exact `task.get` request/response shape
 * against your Manus dashboard/API docs before relying on this in
 * production; only `task.create`'s auth + request shape is confirmed
 * here. For real workloads, prefer wiring Manus's webhook callback
 * into `POST /api/webhooks/manus` and resolving sessions asynchronously
 * instead of polling.
 *
 * Auth: tenant API keys use the `x-manus-api-key` header. If a tenant
 * connected via "Sign in with Manus" OAuth instead of pasting a raw
 * key, pass their OAuth access token and set options.isOAuthToken.
 */
function buildAuthHeader(apiKey, isOAuthToken) {
  return isOAuthToken ? { Authorization: `Bearer ${apiKey}` } : { 'x-manus-api-key': apiKey };
}

function flattenMessages(messages) {
  // Manus's task API takes a single message string rather than a
  // chat-turn array, so fold prior turns into one prompt.
  return messages
    .map((m) => (m.role === 'system' ? `[Instructions] ${m.content}` : m.content))
    .join('\n\n');
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function complete(apiKey, messages, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...buildAuthHeader(apiKey, options.isOAuthToken) };

  let createRes;
  try {
    createRes = await axios.post(
      `${MANUS_BASE_URL}/task.create`,
      { message: { content: flattenMessages(messages) } },
      { headers, timeout: options.timeoutMs || 20000 }
    );
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.error?.message || err.message;
    throw new ProviderError(`Manus task.create failed: ${message}`, status, err.response?.data);
  }

  if (createRes.data?.ok === false) {
    const code = createRes.data.error?.code;
    const status = code === 'permission_denied' ? 401 : 500;
    throw new ProviderError(`Manus rejected the task: ${createRes.data.error?.message}`, status, createRes.data);
  }

  const taskId = createRes.data?.task?.id || createRes.data?.id;
  if (!taskId) {
    // Created, but we can't identify the task to poll it — return
    // what we have rather than failing the whole request.
    return { content: '', raw: createRes.data, usage: null, note: 'task created, id not found for polling' };
  }

  // Best-effort poll for completion (see caveat in the module comment above).
  const deadline = Date.now() + (options.pollTimeoutMs || DEFAULT_POLL_TIMEOUT_MS);
  while (Date.now() < deadline) {
    await sleep(options.pollIntervalMs || DEFAULT_POLL_INTERVAL_MS);
    try {
      const { data } = await axios.get(`${MANUS_BASE_URL}/task.get`, {
        headers,
        params: { id: taskId },
        timeout: 10000,
      });
      const status = data?.task?.status || data?.status;
      if (status && ['completed', 'succeeded', 'done'].includes(status)) {
        const content = data?.task?.output || data?.output || '';
        return { content, raw: data, usage: null };
      }
      if (status && ['failed', 'error'].includes(status)) {
        throw new ProviderError(`Manus task failed: ${data?.task?.error || 'unknown error'}`, 500, data);
      }
    } catch (pollErr) {
      if (pollErr instanceof ProviderError) throw pollErr;
      // Polling endpoint shape unconfirmed — don't fail the whole
      // request on a poll hiccup, just try again until the deadline.
    }
  }

  return {
    content: '',
    raw: { taskId },
    usage: null,
    note: `Manus task ${taskId} did not complete within the poll timeout — consider a webhook-based flow instead.`,
  };
}

module.exports = { complete, providerName: 'manus' };
