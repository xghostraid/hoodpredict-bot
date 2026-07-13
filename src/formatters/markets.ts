import type { Market } from '../types.js';

const CATEGORY_EMOJI: Record<string, string> = {
  stock_tokens: '📈',
  sports: '🏆',
  crypto: '₿',
  politics: '🏛️',
  entertainment: '🎬',
  trending: '🔥',
};

const STATUS_EMOJI: Record<string, string> = {
  open: '🟢',
  live: '🔴 LIVE',
  closed: '🟡',
  resolved: '✅',
  cancelled: '❌',
};

export function categoryEmoji(category: string): string {
  return CATEGORY_EMOJI[category] ?? '📊';
}

export function formatTimeLeft(endTime: string): string {
  const ms = new Date(endTime).getTime() - Date.now();
  if (ms <= 0) return '⏰ Ended';
  const hours = Math.floor(ms / 3_600_000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `⏰ ${days}d ${hours % 24}h left`;
  if (hours > 0) return `⏰ ${hours}h left`;
  return `⏰ ${Math.floor(ms / 60_000)}m left`;
}

export function formatVolume(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`;
  return `$${usd.toFixed(0)}`;
}

export function formatMarketCard(market: Market, compact = false): string {
  const cat = categoryEmoji(market.category);
  const status = market.isLive ? STATUS_EMOJI.live : STATUS_EMOJI[market.status] ?? '📊';
  const time = formatTimeLeft(market.endTime);
  const vol = formatVolume(market.volumeUsd);

  if (compact) {
    const top = market.outcomes[0];
    return (
      `${status} ${cat} *${market.question.slice(0, 60)}${market.question.length > 60 ? '…' : ''}*\n` +
      `💰 ${vol} · ${time} · ${top?.label} ${top?.probability}%`
    );
  }

  const odds = market.outcomes
    .map((o) => `  • *${o.label}* — ${o.probability}% (${o.odds})`)
    .join('\n');

  return (
    `${status} ${cat} *${market.question}*\n\n` +
    `${odds}\n\n` +
    `💰 Volume: ${vol} · 💧 Liq: ${formatVolume(market.liquidityUsd)}\n` +
    `${time} · 🏷 ${market.tags.slice(0, 3).join(' · ')}`
  );
}

export function formatMarketDetail(market: Market): string {
  const header = formatMarketCard(market);
  const desc = market.description ? `\n\n📝 ${market.description}` : '';
  const chain = market.contractAddress
    ? `\n\n🔗 On-chain: \`${market.contractAddress.slice(0, 10)}…\``
    : '';
  return header + desc + chain;
}