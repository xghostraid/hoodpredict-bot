import type { Bot } from 'grammy';
import { getMarketsWithContracts } from '../data/markets.js';
import { fetchOnChainState } from '../chain/markets.js';
import { getResolveSubscribers } from '../db/index.js';

const notified = new Set<string>();

export async function checkMarketResolutions(bot: Bot): Promise<void> {
  const markets = getMarketsWithContracts().filter((m) => m.contractAddress);

  for (const market of markets) {
    const key = `${market.id}:resolved`;
    if (notified.has(key)) continue;

    const state = await fetchOnChainState(market.contractAddress as `0x${string}`);
    if (!state || state.status !== 2) continue;

    const winnerIdx = state.winningOutcome;
    const winner = state.labels[winnerIdx] ?? `Outcome ${winnerIdx}`;
    notified.add(key);

    const subscribers = getResolveSubscribers(market.id);
    const msg =
      `🏁 *Market Resolved!*\n\n` +
      `📌 ${market.question}\n` +
      `✅ Winner: *${winner}*\n\n` +
      `Check /mybets to claim winnings on-chain.`;

    for (const chatId of subscribers) {
      try {
        await bot.api.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
      } catch {
        /* user blocked bot */
      }
    }
  }
}