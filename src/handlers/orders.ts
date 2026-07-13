import type { Context } from 'grammy';
import { addLimitOrder, getActiveLimitOrders, ensureUser } from '../db/index.js';
import { getEnrichedMarket } from '../chain/markets.js';
import { ordersKeyboard } from '../keyboards/index.js';

export async function ordersHandler(ctx: Context) {
  if (!ctx.from) return;
  ensureUser(ctx.from.id, ctx.from.username);

  const orders = getActiveLimitOrders(ctx.from.id);
  const lines = [
    `📋 *Limit Orders*\n`,
    `_Bet when odds hit your target — like limit orders on Based Bot_\n`,
  ];

  if (!orders.length) {
    lines.push('_No active orders._\n\nExample:\n`/limit m6 0 75 50`\n→ Bet $50 on outcome 0 when probability ≥ 75%');
  } else {
    for (const o of orders) {
      const m = await getEnrichedMarket(o.marketId);
      const label = m?.outcomes[o.outcomeIndex]?.label ?? `Outcome ${o.outcomeIndex}`;
      lines.push(
        `• *${m?.question.slice(0, 40) ?? o.marketId}…*\n` +
          `  ${label} ${o.direction} ${o.triggerProbability}% · $${o.amountUsd}`,
      );
    }
  }

  await ctx.reply(lines.join('\n\n'), {
    parse_mode: 'Markdown',
    reply_markup: ordersKeyboard(),
  });
}

export async function limitCommand(ctx: Context) {
  const args = (ctx.message?.text ?? '').split(/\s+/).slice(1);
  if (!ctx.from || args.length < 4) {
    await ctx.reply(
      'Usage: `/limit <marketId> <outcomeIndex> <probability> <amount>`\n' +
        'Example: `/limit m6 0 75 50`',
      { parse_mode: 'Markdown' },
    );
    return;
  }

  const [marketId, outcomeStr, probStr, amountStr] = args;
  const outcomeIndex = parseInt(outcomeStr, 10);
  const triggerProbability = parseFloat(probStr);
  const amountUsd = parseFloat(amountStr);

  const market = await getEnrichedMarket(marketId);
  if (!market) {
    await ctx.reply('Market not found.');
    return;
  }

  addLimitOrder({
    telegramId: ctx.from.id,
    marketId,
    outcomeIndex,
    amountUsd,
    triggerProbability,
    direction: 'above',
  });

  await ctx.reply(
    `✅ *Limit order set*\n\n` +
      `📌 ${market.question}\n` +
      `When *${market.outcomes[outcomeIndex]?.label}* hits ≥ *${triggerProbability}%*\n` +
      `→ Auto-notify to bet *$${amountUsd}*`,
    { parse_mode: 'Markdown' },
  );
}

export async function ordersCallback(ctx: Context) {
  const data = ctx.callbackQuery?.data;
  if (!data?.startsWith('order:') || !ctx.from) return;
  await ctx.answerCallbackQuery();

  if (data === 'order:new') {
    await ctx.reply(
      'Create a limit order:\n`/limit m1 0 70 25`\n\nOr pick a market from /markets first.',
      { parse_mode: 'Markdown' },
    );
  }
}