import type { Bot } from 'grammy';
import { startHandler, helpHandler, menuRouter } from './start.js';
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

export function registerHandlers(bot: Bot) {
  bot.command('start', startHandler);
  bot.command('help', helpHandler);
  bot.command('markets', marketsHandler);
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

  bot.hears(/^(📊 Markets|🎯 My Bets|💼 Portfolio|🔔 Alerts|💎 Premium|🤖 AI Trader|👛 Wallet|❓ Help)$/, menuRouter);

  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;
    if (data.startsWith('cat:') || data.startsWith('market:') || data.startsWith('markets:')) {
      return marketsCallback(ctx);
    }
    if (data.startsWith('bet:') || data.startsWith('amt:') || data.startsWith('instant:'))
      return data.startsWith('instant:') ? instantBetCallback(ctx) : betCallback(ctx);
    if (data.startsWith('sub:')) return subscribeCallback(ctx);
    if (data.startsWith('premium:')) return premiumCallback(ctx);
    if (data.startsWith('ai:')) return aiCallback(ctx);
    if (data.startsWith('forecast:')) return forecastCallback(ctx);
    if (data.startsWith('wallet:')) return walletCallback(ctx);
    if (data.startsWith('recover:')) return recoverCallback(ctx);
    if (data === 'menu:home') return startHandler(ctx);
    if (data === 'noop') return ctx.answerCallbackQuery();
  });

  bot.on('message:text', async (ctx, next) => {
    if (await customAmountHandler(ctx)) return;
    if (await aiRulesTextHandler(ctx)) return;
    if (await recoverAddressHandler(ctx)) return;
    if (await importTextHandler(ctx)) return;
    return next();
  });
}