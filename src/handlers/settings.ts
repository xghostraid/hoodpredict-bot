import type { Context } from 'grammy';
import { config } from '../config.js';
import { ensureUser, getSettings, saveSettings } from '../db/index.js';
import { settingsKeyboard } from '../keyboards/index.js';

export async function settingsHandler(ctx: Context) {
  if (!ctx.from) return;
  ensureUser(ctx.from.id, ctx.from.username);
  const s = getSettings(ctx.from.id);

  await ctx.reply(
    `⚙️ *Settings*\n\n` +
      `💵 Default bet: *$${s.defaultBetUsd}*\n` +
      `⚡ Quick amounts: ${s.quickBets.map((n) => `$${n}`).join(' · ')}\n` +
      `🔔 Resolve alerts: ${s.notifyResolve ? 'ON' : 'OFF'}\n` +
      `🐋 Whale alerts: ${s.notifyWhale ? 'ON' : 'OFF'}\n` +
      `💰 Bet cashback: *${s.cashbackPct}%*\n\n` +
      `Send to update:\n` +
      `\`default 50\` — default bet USD\n` +
      `\`quick 10,25,50,100\` — quick bet buttons\n` +
      `\`cashback 3\` — display cashback %`,
    { parse_mode: 'Markdown', reply_markup: settingsKeyboard(s, config.USE_TESTNET) },
  );
}

export async function settingsCallback(ctx: Context) {
  const data = ctx.callbackQuery?.data;
  if (!data?.startsWith('set:') || !ctx.from) return;
  await ctx.answerCallbackQuery();

  const key = data.slice(4);
  const s = getSettings(ctx.from.id);

  if (key === 'toggle_resolve') {
    saveSettings(ctx.from.id, { notifyResolve: !s.notifyResolve });
  } else if (key === 'toggle_whale') {
    saveSettings(ctx.from.id, { notifyWhale: !s.notifyWhale });
  } else if (key === 'faucet') {
    await ctx.reply(
      '🚰 *Testnet faucet*\n\nGet ETH + USDC for Robinhood Chain testnet:\nhttps://faucet.testnet.chain.robinhood.com',
      { parse_mode: 'Markdown' },
    );
    return;
  }

  await settingsHandler(ctx);
}

export async function settingsTextHandler(ctx: Context): Promise<boolean> {
  if (!ctx.from || !ctx.message?.text) return false;
  const text = ctx.message.text.toLowerCase().trim();
  if (text.startsWith('/')) return false;

  const s = getSettings(ctx.from.id);

  if (text.startsWith('default ')) {
    const n = parseFloat(text.slice(8));
    if (n >= 1 && n <= 5000) {
      saveSettings(ctx.from.id, { defaultBetUsd: n });
      await ctx.reply(`✅ Default bet: $${n}`);
      return true;
    }
  }
  if (text.startsWith('quick ')) {
    const nums = text
      .slice(6)
      .split(',')
      .map((x) => parseFloat(x.trim()))
      .filter((n) => n >= 1 && n <= 10000);
    if (nums.length >= 2) {
      saveSettings(ctx.from.id, { quickBets: nums.slice(0, 4) });
      await ctx.reply(`✅ Quick bets: ${nums.map((n) => `$${n}`).join(', ')}`);
      return true;
    }
  }
  if (text.startsWith('cashback ')) {
    const n = parseFloat(text.slice(9));
    if (n >= 0 && n <= 10) {
      saveSettings(ctx.from.id, { cashbackPct: n });
      await ctx.reply(`✅ Cashback display: ${n}%`);
      return true;
    }
  }
  return false;
}