import type { Context } from 'grammy';
import { mainMenuKeyboard } from '../keyboards/index.js';
import { DISCLAIMER } from '../config.js';
import { hubHandler } from './hub.js';

export const HELP_TEXT = (
  `❓ *HoodPredict Terminal Help*\n\n` +
  `*Based-style features, prediction market native:*\n\n` +
  `⚡ *Quick Bet* — one-tap on hot/live markets\n` +
  `📋 *Limit Orders* — bet when odds hit your target\n` +
  `🐋 *Copy Whales* — mirror top predictors\n` +
  `🏆 *Leaderboard* — top bettors by volume\n` +
  `🎁 *Refer & Earn* — 5% of friends' fees\n` +
  `⚙️ *Settings* — default bet, cashback, alerts\n` +
  `👛 *Wallet* — create, import, or link\n` +
  `🤖 *AI Trader* — auto-scan markets (Premium)\n\n` +
  `*Commands:* /start /markets /quickbet /limit /wallet /refer /leaderboard /copy /settings\n\n` +
  `${DISCLAIMER}`
);

export async function startHandler(ctx: Context) {
  await hubHandler(ctx);
}

export async function helpHandler(ctx: Context) {
  await ctx.reply(HELP_TEXT, {
    parse_mode: 'Markdown',
    reply_markup: mainMenuKeyboard(),
  });
}

export async function menuRouter(ctx: Context) {
  const text = ctx.message?.text;
  if (!text) return;

  const { marketsHandler } = await import('./markets.js');
  const { myBetsHandler } = await import('./bets.js');
  const { portfolioHandler } = await import('./portfolio.js');
  const { premiumHandler } = await import('./premium.js');
  const { aiHandler } = await import('./ai.js');
  const { walletHandler } = await import('./wallet.js');
  const { quickBetHandler } = await import('./quickbet.js');
  const { leaderboardHandler } = await import('./leaderboard.js');
  const { copyTradeHandler } = await import('./copytrade.js');
  const { ordersHandler } = await import('./orders.js');
  const { settingsHandler } = await import('./settings.js');
  const { referralsHandler } = await import('./referrals.js');

  const routes: Record<string, (c: Context) => Promise<void>> = {
    '⚡ Quick Bet': quickBetHandler,
    '📊 Markets': marketsHandler,
    '💼 Portfolio': portfolioHandler,
    '🎯 My Bets': myBetsHandler,
    '🏆 Leaderboard': leaderboardHandler,
    '🐋 Copy Whales': copyTradeHandler,
    '📋 Limit Orders': ordersHandler,
    '👛 Wallet': walletHandler,
    '⚙️ Settings': settingsHandler,
    '🎁 Refer & Earn': referralsHandler,
    '💎 Premium': premiumHandler,
    '🤖 AI Trader': aiHandler,
    '❓ Help': helpHandler,
  };

  const handler = routes[text];
  if (handler) await handler(ctx);
}