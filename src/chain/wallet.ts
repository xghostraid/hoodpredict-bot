import { verifyMessage } from 'viem';
import { publicClient } from './client.js';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function isValidAddress(addr: string): addr is `0x${string}` {
  return ADDRESS_RE.test(addr);
}

export function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function buildSignMessage(telegramId: number, nonce: string): string {
  return `HoodPredict Bot wallet verification\nTelegram ID: ${telegramId}\nNonce: ${nonce}\n\nSign to link your Robinhood Chain wallet. Never share your private key.`;
}

export async function verifyWalletSignature(
  address: `0x${string}`,
  message: string,
  signature: `0x${string}`,
): Promise<boolean> {
  try {
    return await verifyMessage({ address, message, signature });
  } catch {
    return false;
  }
}

export const WALLET_WARNING =
  '🔐 *Wallet Security*\n\n' +
  '• *Never* paste your private key or seed phrase in Telegram\n' +
  '• We only store your *public address* after signature verification\n' +
  '• All bets are signed *on your device* via WalletConnect or HoodPredict web\n' +
  '• HoodPredict Bot cannot move funds without your explicit approval';