import crypto from "crypto";

const STATE_MAX_AGE_MS = 10 * 60 * 1000;

function signPayload(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createLineOAuthState(secret: string) {
  const issuedAt = Date.now().toString(36);
  const nonce = crypto.randomBytes(16).toString("base64url");
  const payload = `${issuedAt}.${nonce}`;
  const signature = signPayload(payload, secret);

  return `${payload}.${signature}`;
}

export function verifyLineOAuthState(state: string, secret: string) {
  const parts = state.split(".");
  if (parts.length !== 3) return false;

  const [issuedAtEncoded, nonce, signature] = parts;
  const issuedAt = Number.parseInt(issuedAtEncoded, 36);

  if (!Number.isFinite(issuedAt) || !nonce || !signature) {
    return false;
  }

  if (Date.now() - issuedAt > STATE_MAX_AGE_MS) {
    return false;
  }

  const payload = `${issuedAtEncoded}.${nonce}`;
  const expectedSignature = signPayload(payload, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}
