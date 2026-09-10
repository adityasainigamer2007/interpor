import "server-only";

/**
 * Small in-memory rate limiter for the credential endpoints.
 *
 * Deliberately process-local: it exists to blunt online guessing against a
 * single portal instance, not to be a distributed quota. Behind more than one
 * instance, move this to Redis or your edge provider's limiter.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const globalBuckets = globalThis as unknown as { __ayavaLimit?: Map<string, Bucket> };
const buckets: Map<string, Bucket> = (globalBuckets.__ayavaLimit ??= new Map());

export interface LimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, max: number, windowMs: number): LimitResult {
  const nowMs = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < nowMs) {
    buckets.set(key, { count: 1, resetAt: nowMs + windowMs });
    return { ok: true, remaining: max - 1, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > max) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - nowMs) / 1000)),
    };
  }
  return { ok: true, remaining: max - bucket.count, retryAfterSeconds: 0 };
}

export function clearLimit(key: string): void {
  buckets.delete(key);
}

/** "3 minutes" / "45 seconds" — for the message shown to a locked-out user. */
export function humanizeSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}
