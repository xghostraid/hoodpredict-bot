import type { Context } from 'grammy';
import { DISCLAIMER } from '../config.js';
import {
  ensureUser,
  getAiRules,
  getAiStats,
  isPremium,
  saveAiRules,
  saveAiTrade,
} from '../db/index.js';
import { aiTraderKeyboard, aiSuggestionKeyboard } from '../keyboards/index.js';
import { scanMarketsForTrades, forecastMarket, formatSuggestion } from '../ai/trader.js';
import { getMarketById } from '../data/markets.js';

export async function aiHandler(ctx: Context) {
  if (!ctx.from) return;
  ensureUser(ctx.from.id, ctx.from.username);

  if (!isPremium(ctx.from.id)) {
    await ctx.reply(
      `🔒 *AI Auto-Trader is Premium only*\n\n` +
        `Get 7 days free: /premium\n\n` +
        `The AI scans Robinhood Chain markets, finds high-confidence edges, ` +
        `and can bet on your behalf (with your approval).\n\n${DISCLAIMER}`,
      { parse_mode: 'Markdown' },
    );
    return;
  }

  const rules = getAiRules(ctx.from.id);
  const stats = getAiStats(ctx.from.id);

  await ctx.reply(
    `🤖 *HoodPredict AI Auto-Trader*\n\n` +
      `⚙️ Max bet: $${rules.maxBetUsd} · Min prob: ${rules.minProbability}%\n` +
      `📂 Categories: ${rules.categories.join(', ')}\n` +
      `🔄 Mode: ${rules.autoExecute ? 'Autonomous' : 'Suggest & approve'}\n\n` +
      `📊 Performance: ${stats.executed} trades · ${stats.winRate}% win · P&L $${stats.pnl.toFixed(2)}\n\n` +
      `What would you like to do?`,
    { parse_mode: 'Markdown', reply_markup: aiTraderKeyboard() },
  );
}

export async function aiCallback(ctx: Context) {
  const data = ctx.callbackQuery?.data;
  if (!data || !ctx.from) return;

  if (data === 'ai:preview') {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `🤖 *AI Trader Preview*\n\n` +
        `"Bet up to $50 on Stock Token markets above 70% probability"\n\n` +
        `Our Grok-powered agent scans 24+ live markets on Robinhood Chain, ` +
        `scores confidence, and suggests or auto-executes within your rules.\n\n` +
        `Start free trial: /premium`,
      { parse_mode: 'Markdown' },
    );
    return;
  }

  if (!isPremium(ctx.from.id)) {
    await ctx.answerCallbackQuery({ text: 'Premium required', show_alert: true });
    return;
  }

  if (data === 'ai:scan') {
    await ctx.answerCallbackQuery({ text: '🔍 Scanning markets…' });
    const rules = getAiRules(ctx.from.id);
    const suggestions = await scanMarketsForTrades(rules, 3);

    if (!suggestions.length) {
      await ctx.reply('No trades match your rules right now. Try lowering min probability in ⚙️ Rules.');
      return;
    }

    for (const s of suggestions) {
      const market = getMarketById(s.marketId);
      const tradeId = saveAiTrade(
        ctx.from.id,
        s.marketId,
        s.outcomeIndex,
        s.amountUsd,
        s.confidence,
        s.reasoning,
      );
      await ctx.reply(formatSuggestion(s, market?.question ?? s.marketId), {
        parse_mode: 'Markdown',
        reply_markup: aiSuggestionKeyboard(
          tradeId,
          s.marketId,
          s.outcomeIndex,
          s.amountUsd,
        ),
      });
    }
    return;
  }

  if (data === 'ai:stats') {
    const stats = getAiStats(ctx.from.id);
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `📊 *AI Trader Performance*\n\n` +
        `Suggestions: ${stats.total}\n` +
        `Executed: ${stats.executed}\n` +
        `Win rate: ${stats.winRate}%\n` +
        `P&L: ${stats.pnl >= 0 ? '🟢' : '🔴'} $${stats.pnl.toFixed(2)}`,
      { parse_mode: 'Markdown' },
    );
    return;
  }

  if (data === 'ai:rules') {
    const rules = getAiRules(ctx.from.id);
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `⚙️ *AI Rules*\n\n` +
        `Send one of:\n` +
        `\`max 50\` — max bet USD\n` +
        `\`prob 70\` — min probability %\n` +
        `\`auto on\` or \`auto off\` — autonomous mode\n\n` +
        `Current: max $${rules.maxBetUsd}, prob ${rules.minProbability}%, auto ${rules.autoExecute}`,
      { parse_mode: 'Markdown' },
    );
    return;
  }

  if (data.startsWith('ai:approve:')) {
    const [, , tradeId, marketId, outcomeStr, amountStr] = data.split(':');
    await ctx.answerCallbackQuery({ text: '✅ Approved — placing bet…' });
    const { getDb } = await import('../db/index.js');
    getDb()
      .prepare(`UPDATE ai_trades SET status = 'executed' WHERE id = ?`)
      .run(tradeId);

    const { placeBetFlow } = await import('./bets.js');
    await placeBetFlow(ctx, marketId, parseInt(outcomeStr, 10), parseFloat(amountStr));
    return;
  }

  if (data.startsWith('ai:reject:')) {
    const tradeId = data.split(':')[2];
    const { getDb } = await import('../db/index.js');
    getDb()
      .prepare(`UPDATE ai_trades SET status = 'rejected' WHERE id = ?`)
      .run(tradeId);
    await ctx.answerCallbackQuery({ text: 'Skipped' });
  }
}

export async function aiRulesTextHandler(ctx: Context): Promise<boolean> {
  if (!ctx.from || !ctx.message?.text || !isPremium(ctx.from.id)) return false;

  const text = ctx.message.text.toLowerCase().trim();
  const rules = getAiRules(ctx.from.id);

  if (text.startsWith('max ')) {
    const n = parseFloat(text.slice(4));
    if (n >= 1 && n <= 1000) {
      saveAiRules(ctx.from.id, { ...rules, maxBetUsd: n });
      await ctx.reply(`✅ Max bet set to $${n}`);
      return true;
    }
  }
  if (text.startsWith('prob ')) {
    const n = parseFloat(text.slice(5));
    if (n >= 50 && n <= 95) {
      saveAiRules(ctx.from.id, { ...rules, minProbability: n });
      await ctx.reply(`✅ Min probability set to ${n}%`);
      return true;
    }
  }
  if (text === 'auto on' || text === 'auto off') {
    saveAiRules(ctx.from.id, { ...rules, autoExecute: text === 'auto on' });
    await ctx.reply(`✅ Auto-execute: ${text === 'auto on' ? 'ON ⚡' : 'OFF'}`);
    return true;
  }
  return false;
}

export async function forecastCallback(ctx: Context) {
  const data = ctx.callbackQuery?.data;
  if (!data?.startsWith('forecast:') || !ctx.from) return;
  await ctx.answerCallbackQuery();

  const marketId = data.slice(9);
  const text = await forecastMarket(marketId);
  await ctx.reply(text + `\n\n${DISCLAIMER}`, { parse_mode: 'Markdown' });
}