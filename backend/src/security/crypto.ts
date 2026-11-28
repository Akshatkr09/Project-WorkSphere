import { createHash, createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const ACCESS_TTL_SECONDS = 15 * 60;

export class InvalidAccessTokenError extends Error {
  constructor() {
    super("Invalid or expired access token");
    this.name = "InvalidAccessTokenError";
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, salt, hash] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !hash) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

type AccessClaims = { sub: string; org: string; role: string; exp: number; iat: number };

function secret(): Buffer {
  const value = process.env.JWT_ACCESS_SECRET;
  if (!value || value.length < 32) throw new Error("JWT_ACCESS_SECRET must be set to at least 32 characters");
  return Buffer.from(value);
}

export function issueAccessToken(userId: string, organizationId: string, role: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    sub: userId, org: organizationId, role, iat: now, exp: now + ACCESS_TTL_SECONDS
  } satisfies AccessClaims)).toString("base64url");
  const input = `${header}.${payload}`;
  return `${input}.${createHmac("sha256", secret()).update(input).digest("base64url")}`;
}

export function verifyAccessToken(token: string): AccessClaims {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) throw new InvalidAccessTokenError();
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    if (header.alg !== "HS256" || header.typ !== "JWT") throw new InvalidAccessTokenError();
    const input = `${parts[0]}.${parts[1]}`;
    const expected = createHmac("sha256", secret()).update(input).digest();
    const actual = Buffer.from(parts[2], "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new InvalidAccessTokenError();
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as AccessClaims;
    if (!claims.sub || !claims.org || !claims.role || !Number.isFinite(claims.exp) ||
        claims.exp <= Math.floor(Date.now() / 1000)) throw new InvalidAccessTokenError();
    return claims;
  } catch (error) {
    if (error instanceof InvalidAccessTokenError) throw error;
    if (error instanceof SyntaxError || error instanceof TypeError) throw new InvalidAccessTokenError();
    throw error;
  }
}

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createOpaqueToken(): string {
  return randomBytes(48).toString("base64url");
}
