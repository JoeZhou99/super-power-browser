const STORAGE_KEY = 'spb-login-accounts-v1';
const LEGACY_STORAGE_KEY = 'user';
const OPTIONS_KEY = 'spb-login-options-v1';
const ENCRYPTION_PREFIX = 'gcm:';
const FALLBACK_PREFIX = 'b64:';
const LEGACY_KEY = 'c4n0lFdTM39TTYjH';
const LEGACY_IV = 'sn7TwyGuU7kJWEAp';

export interface RememberedAccount {
  value: string;
  password: string;
  updatedAt: number;
}

interface StoredAccount {
  value?: unknown;
  username?: unknown;
  identifier?: unknown;
  password?: unknown;
  secret?: unknown;
  updatedAt?: unknown;
}

interface LoginOptions {
  remember?: unknown;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function canUseSubtleCrypto(): boolean {
  return typeof globalThis.crypto?.subtle !== 'undefined';
}

async function encryptionKey(): Promise<CryptoKey> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', encoder.encode('SuperPower Browser local login credentials v1'));
  return globalThis.crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encryptPassword(value: string): Promise<string> {
  if (!value) return '';
  if (!canUseSubtleCrypto()) return `${FALLBACK_PREFIX}${bytesToBase64(encoder.encode(value))}`;
  try {
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await globalThis.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await encryptionKey(), encoder.encode(value));
    return `${ENCRYPTION_PREFIX}${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(encrypted))}`;
  } catch {
    return `${FALLBACK_PREFIX}${bytesToBase64(encoder.encode(value))}`;
  }
}

async function decryptLegacyPassword(value: string): Promise<string> {
  if (!canUseSubtleCrypto()) return '';
  try {
    const decrypted = await globalThis.crypto.subtle.decrypt(
      { name: 'AES-CBC', iv: encoder.encode(LEGACY_IV) },
      await globalThis.crypto.subtle.importKey('raw', encoder.encode(LEGACY_KEY), { name: 'AES-CBC' }, false, ['decrypt']),
      base64ToBytes(value),
    );
    return decoder.decode(decrypted);
  } catch {
    return '';
  }
}

async function decryptPassword(value: string): Promise<string> {
  if (!value) return '';
  if (value.startsWith(ENCRYPTION_PREFIX)) {
    if (!canUseSubtleCrypto()) return '';
    try {
      const [iv, cipher] = value.slice(ENCRYPTION_PREFIX.length).split('.');
      if (!iv || !cipher) return '';
      const plain = await globalThis.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: base64ToBytes(iv) },
        await encryptionKey(),
        base64ToBytes(cipher),
      );
      return decoder.decode(plain);
    } catch {
      return '';
    }
  }
  if (value.startsWith(FALLBACK_PREFIX)) {
    try { return decoder.decode(base64ToBytes(value.slice(FALLBACK_PREFIX.length))); } catch { return ''; }
  }
  // The previous client stored AES-CBC ciphertext without a prefix. Keep its
  // accounts usable, while accepting old unencrypted development records.
  return (await decryptLegacyPassword(value)) || value;
}

function readJson(key: string): unknown {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function normalizeStoredAccount(item: StoredAccount): { value: string; password: string; updatedAt: number } | null {
  const value = typeof item.value === 'string'
    ? item.value
    : typeof item.identifier === 'string'
      ? item.identifier
      : typeof item.username === 'string'
        ? item.username
        : '';
  if (!value.trim()) return null;
  const password = typeof item.password === 'string'
    ? item.password
    : typeof item.secret === 'string'
      ? item.secret
      : '';
  const updatedAt = typeof item.updatedAt === 'number' && Number.isFinite(item.updatedAt) ? item.updatedAt : 0;
  return { value: value.trim(), password, updatedAt };
}

export function readRememberPreference(): boolean {
  const options = readJson(OPTIONS_KEY) as LoginOptions | null;
  if (typeof options?.remember === 'boolean') return options.remember;
  const legacy = readJson('loginForm') as LoginOptions | null;
  return legacy?.remember === true;
}

export function writeRememberPreference(value: boolean): void {
  try { localStorage.setItem(OPTIONS_KEY, JSON.stringify({ remember: value })); } catch { /* storage can be disabled */ }
}

export async function loadRememberedAccounts(): Promise<RememberedAccount[]> {
  const current = readJson(STORAGE_KEY);
  const legacy = current == null ? readJson(LEGACY_STORAGE_KEY) : null;
  const raw = Array.isArray(current) ? current : Array.isArray(legacy) ? legacy : [];
  const result: RememberedAccount[] = [];
  for (const rawItem of raw) {
    if (!rawItem || typeof rawItem !== 'object') continue;
    const item = normalizeStoredAccount(rawItem as StoredAccount);
    if (!item) continue;
    const password = await decryptPassword(item.password);
    const existing = result.find((account) => account.value.toLowerCase() === item.value.toLowerCase());
    if (existing) {
      if (item.updatedAt >= existing.updatedAt) Object.assign(existing, { password, updatedAt: item.updatedAt });
    } else {
      result.push({ value: item.value, password, updatedAt: item.updatedAt });
    }
  }
  result.sort((left, right) => right.updatedAt - left.updatedAt);
  return result;
}

export async function saveRememberedAccounts(accounts: RememberedAccount[]): Promise<void> {
  const stored = await Promise.all(accounts.map(async (account) => ({
    value: account.value,
    password: await encryptPassword(account.password),
    updatedAt: account.updatedAt,
  })));
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stored)); } catch { /* storage can be disabled */ }
}

export async function clearRememberedPassword(identifier: string): Promise<void> {
  const normalized = identifier.trim().toLowerCase();
  if (!normalized) return;
  const accounts = await loadRememberedAccounts();
  const account = accounts.find((item) => item.value.toLowerCase() === normalized);
  if (!account?.password) return;
  account.password = '';
  await saveRememberedAccounts(accounts);
}

export { STORAGE_KEY };
