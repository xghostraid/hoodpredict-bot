import type { Context } from 'grammy';
import { TOP_WHALES, getWhale } from '../data/whales.js';
import { getWatchedWhales, watchWhale } from '../db/index.js';
import { copyWhaleKeyboard } from '../keyboards/index.js';
import { listMarkets } from '../chain/markets.js';

export async function copyTradeHandler(ctx: Context) {
  if (!ctx.from) return;

  const watching = getWatchedWhales(ctx.from.id);
  const lines = [
    `🐋 *Copy Whales*\n`,
    `_Mirror top predictors — Based Bot copy-trade, for markets_\n`,
  ];

  for (const w of TOP_WHALES) {
    const tag = watching.includes(w.id) ? '👁 ' : '';
    lines.push(
      `${tag}${w.emoji} *${w.handle}*\n` +
        `   ${w.specialty} · ${w.winRate}% win · P&L +$${(w.pnlUsd / 1000).toFixed(1)}K`,
    );
  }

  await ctx.reply(lines.join('\n\n'), {
    parse_mode: 'Markdown',
    reply_markup: copyWhaleKeyboard(),
  });
}

export async function copyTradeCallback(ctx: Context) {
  const data = ctx.callbackQuery?.data;
  if (!data?.startsWith('whale:') || !ctx.from) return;

  const [, action, whaleId] = data.split(':');

  if (action === 'watch') {
    const added = watchWhale(ctx.from.id, whaleId);
    const w = getWhale(whaleId);
    await ctx.answerCallbackQuery({
      text: added ? `👁 Watching ${w?.handle}` : 'Already watching',
    });
    return;
  }

  if (action === 'copy') {
    const w = getWhale(whaleId);
    if (!w) return;
    await ctx.answerCallbackQuery({ text: '⚡ Loading whale pick…' });

    const markets = await listMarkets(
      w.specialty === 'Sports'
        ? 'sports'
        : w.specialty === 'Stock Tokens'
          ? 'stock_tokens'
          : w.specialty === 'Politics'
            ? 'politics'
            : 'crypto',
    );
    const pick = markets[0];
    if (!pick) {
      await ctx.reply('No market match for this whale.');
      return;
    }

    const bestIdx = pick.outcomes.reduce(
      (bi, o, i) => (o.probability > pick.outcomes[bi].probability ? i : bi),
      0,
    );
    const { placeBetFlow } = await import('./bets.js');
    await ctx.reply(
      `🐋 *${w.handle}* would bet on:\n${pick.question}\n\n` +
        `Outcome: *${pick.outcomes[bestIdx].label}* (${pick.outcomes[bestIdx].probability}%)`,
      { parse_mode: 'Markdown' },
    );
    await placeBetFlow(ctx, pick.id, bestIdx, 25);
  }
}