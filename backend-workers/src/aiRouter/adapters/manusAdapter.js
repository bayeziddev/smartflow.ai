import { ProviderError } from './baseAdapter.js';

const MANUS_BASE_URL = 'https://api.manus.ai/v2';
const DEFAULT_POLL_INTERVAL_MS = 1500;
const DEFAULT_POLL_TIMEOUT_MS = 20000;

// See the Node backend's manusAdapter.js for the full explanation —
// Manus is a task/agent platform, not a synchronous chat API. This
// polling wrapper is best-effort; prefer Manus's webhook mechanism
// for production reliability.

function buildAuthHeader(apiKey, isOAuthToken) {
  return isOAuthToken ? { Authorization: `Bearer ${apiKey}` } : { 'x-manus-api-key': apiKey };
}

function flattenMessages(messages) {
  return messages.map((m) => (m.role === 'system' ? `[Instructions] ${m.content}` : m.content)).join('\n\n');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function complete(apiKey, messages, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...buildAuthHeader(apiKey, options.isOAuthToken) };

  let createRes, createData;
  try {
    createRes = await fetch(`${MANUS_BASE_URL}/task.create`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message: { content: flattenMessages(messages) } }),
    });
    createData = await createRes.json().catch(() => ({}));
  } catch (err) {
    throw new ProviderError(`Manus task.create failed to send: ${err.message}`, 502);
  }

  if (!createRes.ok || createData.ok === false) {
    const code = createData.error?.code;
    const status = code === 'permission_denied' ? 401 : createRes.status || 500;
    throw new ProviderError(`Manus rejected the task: ${createData.error?.message || createRes.statusText}`, status, createData);
  }

  const taskId = createData?.task?.id || createData?.id;
  if (!taskId) {
    return { content: '', raw: createData, usage: null, note: 'task created, id not found for polling' };
  }

  const deadline = Date.now() + (options.pollTimeoutMs || DEFAULT_POLL_TIMEOUT_MS);
  while (Date.now() < deadline) {
    await sleep(options.pollIntervalMs || DEFAULT_POLL_INTERVAL_MS);
    try {
      const pollRes = await fetch(`${MANUS_BASE_URL}/task.get?id=${encodeURIComponent(taskId)}`, { headers });
      const data = await pollRes.json().catch(() => ({}));
      const status = data?.task?.status || data?.status;
      if (status && ['completed', 'succeeded', 'done'].includes(status)) {
        return { content: data?.task?.output || data?.output || '', raw: data, usage: null };
      }
      if (status && ['failed', 'error'].includes(status)) {
        throw new ProviderError(`Manus task failed: ${data?.task?.error || 'unknown error'}`, 500, data);
      }
    } catch (pollErr) {
      if (pollErr instanceof ProviderError) throw pollErr;
      // keep polling until the deadline on a transient poll error
    }
  }

  return { content: '', raw: { taskId }, usage: null, note: `Manus task ${taskId} did not complete within the poll timeout.` };
}

export const providerName = 'manus';
