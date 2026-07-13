import type { Bot } from 'grammy';
import { getActiveLimitOrders, fillLimitOrder } from '../db/index.js';
import { getEnrichedMarket } from '../chain/markets.js';

export async function checkLimitOrders(bot: Bot): Promise<void> {
  const orders = getActiveLimitOrders();
  if (!orders.length) return;

  for (const order of orders) {
    const market = await getEnrichedMarket(order.marketId);
    if (!market) continue;

    const prob = market.outcomes[order.outcomeIndex]?.probability ?? 0;
    const triggered =
      order.direction === 'above'
        ? prob >= order.triggerProbability
        : prob <= order.triggerProbability;

    if (!triggered) continue;

    fillLimitOrder(order.id);
    const label = market.outcomes[order.outcomeIndex]?.label ?? '?';

    try {
      await bot.api.sendMessage(
        order.telegramId,
        `🎯 *Limit order triggered!*\n\n` +
          `📌 ${market.question}\n` +
          `*${label}* hit *${prob}%* (target ${order.triggerProbability}%)\n\n` +
          `Tap to bet $${order.amountUsd}:`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: `⚡ Bet $${order.amountUsd}`,
                  callback_data: `quick:${order.marketId}:${order.outcomeIndex}:${order.amountUsd}`,
                },
              ],
            ],
          },
        },
      );
    } catch {
      /* blocked */
    }
  }
}