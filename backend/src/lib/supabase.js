const { createClient } = require('@supabase/supabase-js');

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 400;
const FETCH_TIMEOUT_MS = 20000;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableNetworkError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return (
    message.includes('fetch failed') ||
    message.includes('connect timeout') ||
    message.includes('und_err_connect_timeout') ||
    message.includes('enotfound') ||
    message.includes('eai_again') ||
    message.includes('etimedout') ||
    message.includes('econnreset')
  );
}

async function resilientFetch(input, init = {}) {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal
      });
      clearTimeout(timeout);
      return response;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;

      if (!isRetryableNetworkError(error) || attempt === MAX_RETRIES) {
        throw error;
      }

      const delayMs = BASE_DELAY_MS * (attempt + 1);
      console.warn('[SUPABASE RETRY]', {
        attempt: attempt + 1,
        nextDelayMs: delayMs,
        reason: error?.message || String(error)
      });
      await wait(delayMs);
    }
  }

  throw lastError;
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  global: {
    fetch: resilientFetch
  }
});

module.exports = supabase;
