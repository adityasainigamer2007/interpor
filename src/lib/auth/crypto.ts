import "server-only";

import crypto from "node:crypto";

/**
 * Password hashing, HMACs and token generation.
 *
 * Uses only `node:crypto` — scrypt for passwords (memory-hard, no native
 * dependency to install) and HMAC-SHA256 for anything we need to look up by
 * value: session cookies, invitation tokens and one-time email codes are all
 * stored as digests, so a leaked database can't be replayed against the portal.
 */

const DEV_SECRET = "ayava-dev-secret-do-not-use-in-production";

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (value && value.length >= 16) return value;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET is missing or too short. Set it to a 32-byte hex string before deploying — " +
        'generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }
  return DEV_SECRET;
}

/* ---------- Passwords ---------- */

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 } as const;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password.normalize("NFKC"), salt, SCRYPT.keylen, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, N, r, p, saltB64, hashB64] = stored.split("$");
    if (scheme !== "scrypt") return false;

    const salt = Buffer.from(saltB64, "base64url");
    const expected = Buffer.from(hashB64, "base64url");
    const derived = crypto.scryptSync(password.normalize("NFKC"), salt, expected.length, {
      N: Number(N),
      r: Number(r),
      p: Number(p),
      maxmem: 64 * 1024 * 1024,
    });
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** Password policy, shared by sign-up, invite acceptance and reset. */
export function validatePassword(password: string): string | null {
  if (password.length < 10) return "Use at least 10 characters.";
  if (password.length > 200) return "That password is too long.";
  if (!/[a-z]/i.test(password)) return "Include at least one letter.";
  if (!/\d/.test(password)) return "Include at least one number.";
  const weak = ["password", "12345678", "qwertyui", "ayava123", "letmein"];
  if (weak.some((w) => password.toLowerCase().includes(w)))
    return "That password is too easy to guess.";
  return null;
}

/* ---------- Digests & tokens ---------- */

export function hmac(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

/** Constant-time comparison for two digests of equal length. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

/** Six-digit numeric code, uniformly distributed. */
export function generateCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

/* ---------- Session cookie value ---------- */

/** `<sessionId>.<hmac>` — the signature stops forged or guessed session ids. */
export function signSessionId(sessionId: string): string {
  return `${sessionId}.${hmac(sessionId)}`;
}

export function unsignSessionId(cookieValue: string): string | null {
  const idx = cookieValue.lastIndexOf(".");
  if (idx <= 0) return null;
  const sessionId = cookieValue.slice(0, idx);
  const signature = cookieValue.slice(idx + 1);
  if (!safeEqual(signature, hmac(sessionId))) return null;
  return sessionId;
}
