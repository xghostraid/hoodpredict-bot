import type { Context } from 'grammy';
import { listMarkets, getEnrichedMarket } from '../chain/markets.js';
import { getSettings } from '../db/index.js';
import { quickBetKeyboard } from '../keyboards/index.js';
import { formatMarketCard } from '../formatters/markets.js';

export async function quickBetHandler(ctx: Context) {
  if (!ctx.from) return;

  const markets = await listMarkets('trending');
  const live = markets.filter((m) => m.isLive || m.status === 'open').slice(0, 4);

  if (!live.length) {
    await ctx.reply('No hot markets right now. Try /markets');
    return;
  }

  const settings = getSettings(ctx.from.id);
  const lines = [
    `⚡ *Quick Bet*\n`,
    `_One-tap predictions on the hottest markets_\n`,
  ];

  for (const m of live.slice(0, 3)) {
    lines.push(formatMarketCard(m, true), '');
  }

  lines.push(`💰 Default stake: *$${settings.defaultBetUsd}*`);

  await ctx.reply(lines.join('\n'), {
    parse_mode: 'Markdown',
    reply_markup: quickBetKeyboard(live.slice(0, 4), settings.defaultBetUsd),
  });
}

export async function quickBetCallback(ctx: Context) {
  const data = ctx.callbackQuery?.data;
  if (!data?.startsWith('quick:') || !ctx.from) return;
  await ctx.answerCallbackQuery();

  const [, marketId, outcomeStr, amountStr] = data.split(':');
  const { placeBetFlow } = await import('./bets.js');
  await placeBetFlow(ctx, marketId, parseInt(outcomeStr, 10), parseFloat(amountStr));
}