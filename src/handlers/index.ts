import type { Bot } from 'grammy';
import { startHandler, helpHandler, menuRouter } from './start.js';
import { hubHandler } from './hub.js';
import { marketsHandler, marketsCallback, searchHandler } from './markets.js';
import {
  myBetsHandler,
  betCallback,
  confirmHandler,
  customAmountHandler,
  subscribeCallback,
  instantBetCallback,
} from './bets.js';
import { portfolioHandler } from './portfolio.js';
import { premiumHandler, premiumCallback, grantHandler } from './premium.js';
import { aiHandler, aiCallback, aiRulesTextHandler, forecastCallback } from './ai.js';
import {
  walletHandler,
  walletCommand,
  verifyCommand,
  walletCallback,
  importCommand,
  exportCommand,
  importTextHandler,
} from './wallet.js';
import { recoverHandler, recoverCallback, recoverAddressHandler } from './recover.js';
import { createHandler } from './create.js';
import { quickBetHandler, quickBetCallback } from './quickbet.js';
import { referralsHandler, shareReferralCallback } from './referrals.js';
import { leaderboardHandler } from './leaderboard.js';
import { copyTradeHandler, copyTradeCallback } from './copytrade.js';
import { settingsHandler, settingsCallback, settingsTextHandler } from './settings.js';
import { ordersHandler, limitCommand, ordersCallback } from './orders.js';

const MENU_PATTERN =
  /^(⚡ Quick Bet|📊 Markets|💼 Portfolio|🎯 My Bets|🏆 Leaderboard|🐋 Copy Whales|📋 Limit Orders|👛 Wallet|⚙️ Settings|🎁 Refer & Earn|💎 Premium|🤖 AI Trader|❓ Help)$/;

export function registerHandlers(bot: Bot) {
  bot.command('start', startHandler);
  bot.command('help', helpHandler);
  bot.command('hub', hubHandler);
  bot.command('markets', marketsHandler);
  bot.command('quickbet', quickBetHandler);
  bot.command('mybets', myBetsHandler);
  bot.command('portfolio', portfolioHandler);
  bot.command('create', createHandler);
  bot.command('premium', premiumHandler);
  bot.command('subscribe', premiumHandler);
  bot.command('ai', aiHandler);
  bot.command('wallet', walletCommand);
  bot.command('import', importCommand);
  bot.command('export', exportCommand);
  bot.command('verify', verifyCommand);
  bot.command('confirm', confirmHandler);
  bot.command('search', searchHandler);
  bot.command('grant', grantHandler);
  bot.command('recover', recoverHandler);
  bot.command('refer', referralsHandler);
  bot.command('leaderboard', leaderboardHandler);
  bot.command('copy', copyTradeHandler);
  bot.command('settings', settingsHandler);
  bot.command('limit', limitCommand);
  bot.command('orders', ordersHandler);

  bot.hears(MENU_PATTERN, menuRouter);

  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;

    if (data.startsWith('hub:')) {
      await ctx.answerCallbackQuery();
      const map: Record<string, () => Promise<void>> = {
        'hub:quick': () => quickBetHandler(ctx),
        'hub:markets': () => marketsHandler(ctx),
        'hub:copy': () => copyTradeHandler(ctx),
        'hub:orders': () => ordersHandler(ctx),
        'hub:wallet': () => walletHandler(ctx),
        'hub:refer': () => referralsHandler(ctx),
      };
      return map[data]?.();
    }

    if (data.startsWith('cat:') || data.startsWith('market:') || data.startsWith('markets:')) {
      return marketsCallback(ctx);
    }
    if (data.startsWith('quick:')) return quickBetCallback(ctx);
    if (data.startsWith('bet:') || data.startsWith('amt:')) return betCallback(ctx);
    if (data.startsWith('instant:')) return instantBetCallback(ctx);
    if (data.startsWith('sub:')) return subscribeCallback(ctx);
    if (data.startsWith('premium:')) return premiumCallback(ctx);
    if (data.startsWith('ai:')) return aiCallback(ctx);
    if (data.startsWith('forecast:')) return forecastCallback(ctx);
    if (data.startsWith('wallet:')) return walletCallback(ctx);
    if (data.startsWith('recover:')) return recoverCallback(ctx);
    if (data.startsWith('whale:')) return copyTradeCallback(ctx);
    if (data.startsWith('set:')) return settingsCallback(ctx);
    if (data.startsWith('order:')) return ordersCallback(ctx);
    if (data === 'menu:home') return hubHandler(ctx);
    if (data === 'noop') return ctx.answerCallbackQuery();
  });

  bot.on('message:text', async (ctx, next) => {
    if (await customAmountHandler(ctx)) return;
    if (await aiRulesTextHandler(ctx)) return;
    if (await settingsTextHandler(ctx)) return;
    if (await recoverAddressHandler(ctx)) return;
    if (await importTextHandler(ctx)) return;
    return next();
  });
}