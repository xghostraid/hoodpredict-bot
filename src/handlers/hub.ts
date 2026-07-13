import type { Context } from 'grammy';
import { config, DISCLAIMER } from '../config.js';
import { ensureUser, getUser, getUserBets, getSettings, isPremium } from '../db/index.js';
import { getUsdcBalance } from '../chain/bets.js';
import { shortenAddress } from '../chain/wallet.js';
import { listMarkets } from '../chain/markets.js';
import { hubKeyboard } from '../keyboards/index.js';
import { formatVolume } from '../formatters/markets.js';

export async function buildHubMessage(telegramId: number, username?: string): Promise<string> {
  ensureUser(telegramId, username);
  const user = getUser(telegramId)!;
  const bets = getUserBets(telegramId);
  const active = bets.filter((b) => b.status === 'active');
  const won = bets.filter((b) => b.status === 'won');
  const lost = bets.filter((b) => b.status === 'lost');
  const pnl =
    won.reduce((s, b) => s + b.potentialPayout - b.amount, 0) -
    lost.reduce((s, b) => s + b.amount, 0);

  let walletLine = '👛 _No wallet — tap Wallet to set up_';
  let usdcLine = '';

  if (user.wallet_address) {
    const mode = user.wallet_mode === 'custodial' ? '🔐' : '🔗';
    walletLine = `${mode} \`${shortenAddress(user.wallet_address)}\``;
    const bal = await getUsdcBalance(user.wallet_address as `0x${string}`);
    usdcLine = `💵 *$${bal.toFixed(2)}* ${config.COLLATERAL_SYMBOL}`;
  }

  const trending = await listMarkets('trending');
  const hot = trending.find((m) => m.isLive) ?? trending[0];
  const hotLine = hot
    ? `🔥 *${hot.isLive ? 'LIVE · ' : ''}${hot.question.slice(0, 42)}…*\n   ${hot.outcomes[0]?.label} ${hot.outcomes[0]?.probability}% · ${formatVolume(hot.volumeUsd)} vol`
    : '🔥 Markets loading…';

  const tier = isPremium(telegramId) ? '💎 Premium' : '🆓 Free';
  const cashback = getSettings(telegramId).cashbackPct;

  return (
    `🏹 *HoodPredict Terminal*\n` +
    `_Robinhood Chain · Prediction Markets_\n\n` +
    `${walletLine}\n` +
    `${usdcLine ? usdcLine + '\n' : ''}` +
    `📊 P&L \`${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}\` · ${active.length} open bets\n` +
    `🏷 ${tier} · ${cashback}% bet cashback\n\n` +
    `${hotLine}\n\n` +
    `⚡ _Quick bet · Copy whales · Limit orders · AI trader_\n\n` +
    `${DISCLAIMER}`
  );
}

export async function hubHandler(ctx: Context) {
  if (!ctx.from) return;

  const payload = (ctx.message?.text ?? '').split(/\s+/)[1];
  let referredBy: number | undefined;
  if (payload?.startsWith('ref_')) {
    const id = parseInt(payload.slice(4), 10);
    if (!isNaN(id) && id !== ctx.from.id) referredBy = id;
  }

  ensureUser(ctx.from.id, ctx.from.username, referredBy);

  const text = await buildHubMessage(ctx.from.id, ctx.from.username);
  await ctx.reply(text, {
    parse_mode: 'Markdown',
    reply_markup: hubKeyboard(),
  });
}