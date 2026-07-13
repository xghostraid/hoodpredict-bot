import { encodeFunctionData, formatUnits, parseUnits } from 'viem';
import { abis, USDC_ADDRESS, USDC_DECIMALS } from './contracts.js';
import { explorerTxUrl } from './client.js';
import { publicClient } from './client.js';
import type { Market } from '../types.js';
import { config } from '../config.js';

export interface BetIntent {
  marketId: string;
  contractAddress: `0x${string}`;
  outcomeIndex: number;
  outcomeLabel: string;
  amountUsd: number;
  question: string;
}

export function buildBetWebLink(intent: BetIntent): string {
  const params = new URLSearchParams({
    market: intent.marketId,
    outcome: String(intent.outcomeIndex),
    amount: String(intent.amountUsd),
  });
  return `${config.WEB_APP_URL}/markets/${intent.marketId}?${params}`;
}

export function buildApproveCalldata(spender: `0x${string}`, amountUsd: number): `0x${string}` {
  const amount = parseUnits(amountUsd.toFixed(USDC_DECIMALS), USDC_DECIMALS);
  return encodeFunctionData({
    abi: abis.usdc,
    functionName: 'approve',
    args: [spender, amount],
  });
}

export function buildBetCalldata(outcomeIndex: number, amountUsd: number): `0x${string}` {
  const amount = parseUnits(amountUsd.toFixed(USDC_DECIMALS), USDC_DECIMALS);
  return encodeFunctionData({
    abi: abis.market,
    functionName: 'bet',
    args: [outcomeIndex, amount],
  });
}

export async function getUsdcBalance(wallet: `0x${string}`): Promise<number> {
  try {
    const bal = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: abis.usdc,
      functionName: 'balanceOf',
      args: [wallet],
    });
    return Number(formatUnits(bal as bigint, USDC_DECIMALS));
  } catch {
    return 0;
  }
}

export async function getUserPositions(
  market: Market,
  wallet: `0x${string}`,
): Promise<{ outcomeIndex: number; label: string; shares: number }[]> {
  if (!market.contractAddress) return [];

  const addr = market.contractAddress as `0x${string}`;
  const positions: { outcomeIndex: number; label: string; shares: number }[] = [];

  for (let i = 0; i < market.outcomes.length; i++) {
    const shares = await publicClient.readContract({
      address: addr,
      abi: abis.market,
      functionName: 'positions',
      args: [wallet, i],
    });
    const n = Number(formatUnits(shares as bigint, USDC_DECIMALS));
    if (n > 0) {
      positions.push({
        outcomeIndex: i,
        label: market.outcomes[i].label,
        shares: n,
      });
    }
  }
  return positions;
}

export function estimatePayout(market: Market, outcomeIndex: number, amountUsd: number): number {
  const fee = amountUsd * 0.02;
  const net = amountUsd - fee;
  const pool = market.outcomes[outcomeIndex]?.poolUsd ?? 0;
  const totalPool = market.outcomes.reduce((s, o) => s + o.poolUsd, 0) + net;
  const newPool = pool + net;
  if (newPool <= 0) return amountUsd * 2;
  return (net * totalPool) / newPool;
}

export async function verifyBetTx(
  txHash: `0x${string}`,
  wallet: `0x${string}`,
  contractAddress: `0x${string}`,
): Promise<boolean> {
  try {
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 60_000 });
    return receipt.status === 'success' && receipt.from.toLowerCase() === wallet.toLowerCase();
  } catch {
    return false;
  }
}

export function formatBetInstructions(intent: BetIntent, wallet?: string): string {
  const link = buildBetWebLink(intent);
  const lines = [
    `🎯 *Confirm your bet*`,
    ``,
    `📌 ${intent.question}`,
    `✅ *${intent.outcomeLabel}* — $${intent.amountUsd.toFixed(2)} USDC`,
    ``,
    `1️⃣ Open HoodPredict & connect wallet`,
    `2️⃣ Approve USDC → place bet on-chain`,
    `3️⃣ Send tx hash: \`/confirm ${intent.marketId} <txhash>\``,
    ``,
    wallet ? `👛 Wallet: \`${wallet.slice(0, 6)}...${wallet.slice(-4)}\`` : `⚠️ Link wallet first: /wallet`,
    ``,
    `[🚀 Bet on HoodPredict](${link})`,
  ];
  return lines.join('\n');
}

export { explorerTxUrl };