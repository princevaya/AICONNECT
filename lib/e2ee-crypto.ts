// lib/e2ee-crypto.ts
// Browser Web Crypto ECDH (P-256) + HKDF-SHA256 + AES-256-GCM end-to-end encryption helpers

export type E2EEEnvelope = {
  v: number;
  alg: "AES-GCM";
  iv: string;
  ciphertext: string;
  keyVersion?: number;
  senderPublicKey?: string;
};

const STORAGE_PREFIX = "aiconnect-e2ee-identity-v1";

function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < view.length; i += 1) {
    binary += String.fromCharCode(view[i]);
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export function isWebCryptoSupported(): boolean {
  return typeof window !== "undefined" && Boolean(window.crypto?.subtle);
}

export async function ensureIdentityKeyPair(userId: string): Promise<{
  publicKeyJwkString: string;
  publicKeyJwk: JsonWebKey;
  privateKey: CryptoKey;
}> {
  if (!isWebCryptoSupported()) {
    throw new Error("Web Crypto API is unavailable in this environment");
  }

  const keyName = `${STORAGE_PREFIX}:${userId}`;
  const cached = window.localStorage.getItem(keyName);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as { pub: JsonWebKey; priv: JsonWebKey };
      if (parsed?.pub && parsed?.priv) {
        const privateKey = await window.crypto.subtle.importKey(
          "jwk",
          parsed.priv,
          { name: "ECDH", namedCurve: "P-256" },
          true,
          ["deriveKey", "deriveBits"]
        );
        return {
          publicKeyJwkString: JSON.stringify(parsed.pub),
          publicKeyJwk: parsed.pub,
          privateKey,
        };
      }
    } catch {
      // Regenerate if local key cache is corrupted
    }
  }

  const keyPair = await window.crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );
  const pub = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const priv = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
  window.localStorage.setItem(keyName, JSON.stringify({ pub, priv }));

  return {
    publicKeyJwkString: JSON.stringify(pub),
    publicKeyJwk: pub,
    privateKey: keyPair.privateKey,
  };
}

export async function importPublicEcdhKey(jwkString: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkString) as JsonWebKey;
  return window.crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
}

export async function derivePairwiseAesKey(
  myPrivateKey: CryptoKey,
  peerPublicKeyJwkString: string,
  saltContext: string
): Promise<CryptoKey> {
  const peerPublicKey = await importPublicEcdhKey(peerPublicKeyJwkString);
  const sharedBits = await window.crypto.subtle.deriveBits(
    { name: "ECDH", public: peerPublicKey },
    myPrivateKey,
    256
  );

  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    sharedBits,
    "HKDF",
    false,
    ["deriveKey"]
  );

  const enc = new TextEncoder();
  return window.crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: enc.encode(`aiconnect-e2ee-salt:${saltContext}`),
      info: enc.encode("aiconnect-e2ee-aes256gcm"),
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function generateGroupAesKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function wrapGroupKeyForMember(input: {
  groupKey: CryptoKey;
  myPrivateKey: CryptoKey;
  memberPublicKeyJwkString: string;
  roomCode: string;
}): Promise<string> {
  const wrappingKey = await derivePairwiseAesKey(
    input.myPrivateKey,
    input.memberPublicKeyJwkString,
    `room-wrap:${input.roomCode}`
  );
  const rawGroupKey = await window.crypto.subtle.exportKey("raw", input.groupKey);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    rawGroupKey
  );
  return JSON.stringify({
    iv: toBase64(iv),
    ct: toBase64(encrypted),
  });
}

export async function unwrapGroupKey(input: {
  wrappedKeyJson: string;
  myPrivateKey: CryptoKey;
  senderPublicKeyJwkString: string;
  roomCode: string;
}): Promise<CryptoKey> {
  const parsed = JSON.parse(input.wrappedKeyJson) as { iv: string; ct: string };
  const wrappingKey = await derivePairwiseAesKey(
    input.myPrivateKey,
    input.senderPublicKeyJwkString,
    `room-wrap:${input.roomCode}`
  );
  const iv = fromBase64(parsed.iv);
  const ct = fromBase64(parsed.ct);
  const rawGroupKey = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    wrappingKey,
    toArrayBuffer(ct)
  );
  return window.crypto.subtle.importKey(
    "raw",
    rawGroupKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptMessageText(
  plaintext: string,
  aesKey: CryptoKey,
  options?: { keyVersion?: number; senderPublicKey?: string }
): Promise<E2EEEnvelope> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encoded
  );
  return {
    v: 1,
    alg: "AES-GCM",
    iv: toBase64(iv),
    ciphertext: toBase64(encrypted),
    keyVersion: options?.keyVersion || 1,
    ...(options?.senderPublicKey ? { senderPublicKey: options.senderPublicKey } : {}),
  };
}

export async function decryptMessageText(
  envelope: E2EEEnvelope,
  aesKey: CryptoKey
): Promise<string> {
  const iv = fromBase64(envelope.iv);
  const ct = fromBase64(envelope.ciphertext);
  const plainBuf = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    aesKey,
    toArrayBuffer(ct)
  );
  return new TextDecoder().decode(plainBuf);
}

export async function computeKeyFingerprint(jwkString: string): Promise<string> {
  if (!isWebCryptoSupported()) return "unavailable";
  const digest = await window.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(jwkString)
  );
  const bytes = Array.from(new Uint8Array(digest)).slice(0, 8);
  return bytes.map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join(":");
}

