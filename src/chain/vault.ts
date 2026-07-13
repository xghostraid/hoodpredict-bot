/** Encrypted wallet vault — create, import, and unlock user wallets. */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import {
  generateMnemonic,
  mnemonicToAccount,
  privateKeyToAccount,
  english,
} from 'viem/accounts';
import type { Account } from 'viem';
import { config } from '../config.js';

export type WalletCredential =
  | { type: 'mnemonic'; value: string }
  | { type: 'privateKey'; value: `0x${string}` };

function encryptionSecret(): string {
  return config.WALLET_ENCRYPTION_SECRET || config.TELEGRAM_BOT_TOKEN;
}

function deriveKey(telegramId: number): Buffer {
  return scryptSync(`${encryptionSecret()}:${telegramId}`, 'hoodpredict-vault-v1', 32);
}

export function encryptCredential(telegramId: number, credential: WalletCredential): string {
  const payload = JSON.stringify(credential);
  const key = deriveKey(telegramId);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptCredential(telegramId: number, blob: string): WalletCredential {
  const raw = Buffer.from(blob, 'base64');
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const data = raw.subarray(28);
  const key = deriveKey(telegramId);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  return JSON.parse(decrypted) as WalletCredential;
}

export function accountFromCredential(credential: WalletCredential): Account {
  if (credential.type === 'mnemonic') {
    return mnemonicToAccount(credential.value);
  }
  return privateKeyToAccount(credential.value);
}

export function createWallet(): { address: `0x${string}`; mnemonic: string } {
  const mnemonic = generateMnemonic(english);
  const account = mnemonicToAccount(mnemonic);
  return { address: account.address, mnemonic };
}

export function parseImportInput(input: string): WalletCredential | null {
  const trimmed = input.trim().replace(/"/g, '');

  // Private key: 0x + 64 hex chars
  if (/^0x[a-fA-F0-9]{64}$/.test(trimmed)) {
    return { type: 'privateKey', value: trimmed as `0x${string}` };
  }

  // Mnemonic: 12 or 24 words
  const words = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 12 || words.length === 24) {
    try {
      const account = mnemonicToAccount(words.join(' '));
      if (account.address) {
        return { type: 'mnemonic', value: words.join(' ') };
      }
    } catch {
      return null;
    }
  }

  // Raw hex without 0x
  if (/^[a-fA-F0-9]{64}$/.test(trimmed)) {
    return { type: 'privateKey', value: `0x${trimmed}` as `0x${string}` };
  }

  return null;
}

export function maskSecret(value: string): string {
  if (value.length <= 12) return '••••••••';
  return `${value.slice(0, 6)}••••${value.slice(-4)}`;
}

export const CUSTODIAL_NOTICE =
  '🔐 *HoodPredict Wallet*\n\n' +
  'You can *create* a new wallet or *import* an existing one.\n\n' +
  '• Keys are *encrypted* on our server (AES-256-GCM)\n' +
  '• Used to sign bets on Robinhood Chain for you\n' +
  '• *Always* save your seed phrase — we cannot recover it if lost\n' +
  '• For max security, use *Link external wallet* instead\n\n' +
  '⚠️ _Custodial wallets carry risk. Not financial advice._';