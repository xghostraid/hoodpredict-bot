import { formatUnits } from 'viem';
import { getMarketById, getMarketsWithContracts } from '../data/markets.js';
import type { Market, MarketOutcome } from '../types.js';
import { abis, CHAIN_STATUS_MAP, FACTORY_ADDRESS } from './contracts.js';
import { publicClient } from './client.js';

export interface OnChainMarketState {
  question: string;
  category: string;
  status: number;
  outcomeCount: number;
  totalVolume: bigint;
  endTime: bigint;
  winningOutcome: number;
  pools: { shares: bigint; totalBets: bigint }[];
  labels: string[];
}

export async function fetchOnChainState(
  contractAddress: `0x${string}`,
): Promise<OnChainMarketState | null> {
  try {
    const [
      question,
      category,
      status,
      outcomeCount,
      totalVolume,
      endTime,
      winningOutcome,
    ] = await Promise.all([
      publicClient.readContract({
        address: contractAddress,
        abi: abis.market,
        functionName: 'question',
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: abis.market,
        functionName: 'category',
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: abis.market,
        functionName: 'status',
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: abis.market,
        functionName: 'outcomeCount',
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: abis.market,
        functionName: 'totalVolume',
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: abis.market,
        functionName: 'endTime',
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: abis.market,
        functionName: 'winningOutcome',
      }),
    ]);

    const count = Number(outcomeCount);
    const pools: OnChainMarketState['pools'] = [];
    const labels: string[] = [];

    for (let i = 0; i < count; i++) {
      const [pool, label] = await Promise.all([
        publicClient.readContract({
          address: contractAddress,
          abi: abis.market,
          functionName: 'pools',
          args: [i],
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: abis.market,
          functionName: 'outcomeLabels',
          args: [i],
        }),
      ]);
      const p = pool as readonly [bigint, bigint];
      pools.push({ shares: p[0], totalBets: p[1] });
      labels.push(label as string);
    }

    return {
      question: question as string,
      category: category as string,
      status: Number(status),
      outcomeCount: count,
      totalVolume: totalVolume as bigint,
      endTime: endTime as bigint,
      winningOutcome: Number(winningOutcome),
      pools,
      labels,
    };
  } catch {
    return null;
  }
}

export function mergeOnChainOutcomes(
  market: Market,
  onChain: OnChainMarketState | null,
): MarketOutcome[] {
  if (!onChain || onChain.pools.every((p) => p.shares === 0n)) {
    return market.outcomes;
  }

  const totalShares = onChain.pools.reduce((s, p) => s + p.shares, 0n);
  return onChain.labels.map((label, i) => {
    const shares = onChain.pools[i]?.shares ?? 0n;
    const prob =
      totalShares > 0n ? Number((shares * 10000n) / totalShares) / 100 : market.outcomes[i]?.probability ?? 50;
    const poolUsd = Number(formatUnits(shares, 6));
    return {
      id: `o${i}`,
      label,
      probability: Math.round(prob * 10) / 10,
      odds: `${(100 / Math.max(prob, 1)).toFixed(1)}x`,
      poolUsd: poolUsd || market.outcomes[i]?.poolUsd || 0,
    };
  });
}

export async function enrichMarket(market: Market): Promise<Market> {
  if (!market.contractAddress) return market;

  const onChain = await fetchOnChainState(market.contractAddress as `0x${string}`);
  if (!onChain) return market;

  const chainStatus = CHAIN_STATUS_MAP[onChain.status] ?? market.status;
  const volumeUsd = Number(formatUnits(onChain.totalVolume, 6)) || market.volumeUsd;

  return {
    ...market,
    status: market.isLive && chainStatus === 'open' ? 'live' : (chainStatus as Market['status']),
    outcomes: mergeOnChainOutcomes(market, onChain),
    volumeUsd,
    endTime: new Date(Number(onChain.endTime) * 1000).toISOString(),
  };
}

export async function listMarkets(category?: string, query?: string): Promise<Market[]> {
  const { getMarketsByCategory, searchMarkets } = await import('../data/markets.js');
  let markets = query
    ? searchMarkets(query)
    : category
      ? getMarketsByCategory(category)
      : getMarketsWithContracts();

  const enriched = await Promise.all(markets.slice(0, 12).map(enrichMarket));
  const rest = markets.slice(12);
  return [...enriched, ...rest];
}

export async function getEnrichedMarket(id: string): Promise<Market | undefined> {
  const market = getMarketById(id);
  if (!market) return undefined;
  return enrichMarket(market);
}

export async function getFactoryMarketCount(): Promise<number> {
  try {
    const count = await publicClient.readContract({
      address: FACTORY_ADDRESS,
      abi: abis.factory,
      functionName: 'marketCount',
    });
    return Number(count);
  } catch {
    return 0;
  }
}