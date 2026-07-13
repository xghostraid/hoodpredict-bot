import type { Context } from 'grammy';
import { ensureUser } from '../db/index.js';
import { mainMenuKeyboard } from '../keyboards/index.js';
import { DISCLAIMER } from '../config.js';

export const WELCOME = (
  `🎰 *Welcome to HoodPredict!*\n\n` +
  `Polymarket-style prediction markets on *Robinhood Chain* 🏹\n\n` +
  `📈 Stock Tokens · 🏆 Sports · ₿ Crypto · 🏛️ Politics\n\n` +
  `*Free:* Browse markets, place bets, track portfolio\n` +
  `*Premium:* 🤖 AI Auto-Trader + advanced analytics\n\n` +
  `${DISCLAIMER}`
);

export const HELP_TEXT = (
  `❓ *HoodPredict Bot Help*\n\n` +
  `*Commands:*\n` +
  `/start — Main menu\n` +
  `/markets — Browse prediction markets\n` +
  `/mybets — Your active bets\n` +
  `/portfolio — Portfolio & P&L\n` +
  `/create — Create a new market\n` +
  `/premium — Upgrade + 7-day trial\n` +
  `/ai — AI Auto-Trader (Premium)\n` +
  `/wallet — Link Robinhood Chain wallet\n` +
  `/recover — Re-link wallet after Telegram reset\n` +
  `/search <query> — Find markets\n\n` +
  `*Betting flow:*\n` +
  `1. Browse market → pick outcome → choose amount\n` +
  `2. Sign transaction in your wallet (never share private keys!)\n` +
  `3. Confirm with /confirm <marketId> <txHash>\n\n` +
  `${DISCLAIMER}`
);

export async function startHandler(ctx: Context) {
  const user = ctx.from;
  if (!user) return;
  ensureUser(user.id, user.username);
  await ctx.reply(WELCOME, {
    parse_mode: 'Markdown',
    reply_markup: mainMenuKeyboard(),
  });
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

  const routes: Record<string, (c: Context) => Promise<void>> = {
    '📊 Markets': marketsHandler,
    '🎯 My Bets': myBetsHandler,
    '💼 Portfolio': portfolioHandler,
    '🔔 Alerts': async (c) => {
      await c.reply(
        '🔔 *Alerts*\n\nSubscribe to any market with the 🔔 button on market details.\nYou\'ll get notified when markets resolve.\n\nPremium users get early access to new markets.',
        { parse_mode: 'Markdown' },
      );
    },
    '💎 Premium': premiumHandler,
    '🤖 AI Trader': aiHandler,
    '👛 Wallet': walletHandler,
    '❓ Help': helpHandler,
  };

  const handler = routes[text];
  if (handler) await handler(ctx);
}