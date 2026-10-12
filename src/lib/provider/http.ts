/**
 * Shared HTTP helper for provider adapters.
 * Timeouts, backoff on 429/5xx, logging without secrets.
 */

export type HttpFetchOptions = {
  url: string;
  /** Headers without Authorization if using query key — never log full URL with apikey */
  headers?: Record<string, string>;
  timeoutMs: number;
  maxRetries: number;
  /** Safe label for logs (path only) */
  logLabel: string;
  fetchImpl?: typeof fetch;
};

export type HttpFetchResult = {
  ok: boolean;
  status: number;
  body: unknown;
  attempts: number;
  error?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    for (const key of ["apikey", "api_token", "apiKey", "token", "key"]) {
      if (u.searchParams.has(key)) u.searchParams.set(key, "[REDACTED]");
    }
    return u.toString();
  } catch {
    return "[invalid-url]";
  }
}

export async function providerFetch(opts: HttpFetchOptions): Promise<HttpFetchResult> {
  const fetchFn = opts.fetchImpl ?? fetch;
  let attempts = 0;
  let lastStatus = 0;
  let lastError = "";

  while (attempts <= opts.maxRetries) {
    attempts += 1;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
    try {
      const res = await fetchFn(opts.url, {
        headers: opts.headers,
        signal: controller.signal,
        cache: "no-store",
      });
      lastStatus = res.status;
      const text = await res.text();
      let body: unknown = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = { raw: text.slice(0, 200) };
      }

      if (res.status === 429 || res.status >= 500) {
        lastError = `HTTP ${res.status}`;
        console.warn(
          `[provider] ${opts.logLabel} attempt ${attempts} → ${res.status} url=${redactUrl(opts.url)}`,
        );
        if (attempts <= opts.maxRetries) {
          await sleep(Math.min(4000, 300 * 2 ** (attempts - 1)));
          continue;
        }
        return { ok: false, status: res.status, body, attempts, error: lastError };
      }

      if (!res.ok) {
        console.warn(
          `[provider] ${opts.logLabel} failed status=${res.status} url=${redactUrl(opts.url)}`,
        );
        return {
          ok: false,
          status: res.status,
          body,
          attempts,
          error: `HTTP ${res.status}`,
        };
      }

      return { ok: true, status: res.status, body, attempts };
    } catch (err) {
      lastError = err instanceof Error ? err.message : "fetch failed";
      console.warn(
        `[provider] ${opts.logLabel} error attempt=${attempts}: ${lastError} url=${redactUrl(opts.url)}`,
      );
      if (attempts <= opts.maxRetries) {
        await sleep(Math.min(4000, 300 * 2 ** (attempts - 1)));
        continue;
      }
      return { ok: false, status: lastStatus || 0, body: null, attempts, error: lastError };
    } finally {
      clearTimeout(timer);
    }
  }

  return { ok: false, status: lastStatus, body: null, attempts, error: lastError || "exhausted" };
}
