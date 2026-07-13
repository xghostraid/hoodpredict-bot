import type { Context } from 'grammy';
import { listMarkets, getEnrichedMarket } from '../chain/markets.js';
import { categoryKeyboard, marketDetailKeyboard, marketsListKeyboard } from '../keyboards/index.js';
import { formatMarketCard, formatMarketDetail } from '../formatters/markets.js';
import { ensureUser } from '../db/index.js';

const sessionCategory = new Map<number, string>();
const sessionMarkets = new Map<number, Awaited<ReturnType<typeof listMarkets>>>();

export async function marketsHandler(ctx: Context) {
  if (ctx.from) ensureUser(ctx.from.id, ctx.from.username);
  await ctx.reply('📊 *Browse Markets*\nPick a category:', {
    parse_mode: 'Markdown',
    reply_markup: categoryKeyboard(),
  });
}

export async function searchHandler(ctx: Context) {
  const query = (ctx.message?.text ?? '').replace(/^\/search\s*/i, '').trim();
  if (!query) {
    await ctx.reply('Usage: `/search Lakers` or `/search NVDA`', { parse_mode: 'Markdown' });
    return;
  }

  const markets = await listMarkets(undefined, query);
  if (!markets.length) {
    await ctx.reply(`No markets found for "${query}"`);
    return;
  }

  if (ctx.from) sessionMarkets.set(ctx.from.id, markets);
  await ctx.reply(`🔍 *${markets.length} results* for "${query}"`, {
    parse_mode: 'Markdown',
    reply_markup: marketsListKeyboard(markets),
  });
}

export async function marketsCallback(ctx: Context) {
  const data = ctx.callbackQuery?.data;
  if (!data || !ctx.from) return;
  await ctx.answerCallbackQuery();

  if (data.startsWith('cat:')) {
    const cat = data.slice(4);
    if (cat === 'refresh') {
      const prev = sessionCategory.get(ctx.from.id) ?? 'trending';
      const markets = await listMarkets(prev);
      sessionMarkets.set(ctx.from.id, markets);
      await ctx.editMessageText(`📊 *${titleForCategory(prev)}* (${markets.length})`, {
        parse_mode: 'Markdown',
        reply_markup: marketsListKeyboard(markets),
      });
      return;
    }
    if (cat === 'prompt') {
      await ctx.reply('Send: `/search your query`', { parse_mode: 'Markdown' });
      return;
    }

    sessionCategory.set(ctx.from.id, cat);
    const markets = await listMarkets(cat);
    sessionMarkets.set(ctx.from.id, markets);
    await ctx.editMessageText(`📊 *${titleForCategory(cat)}* (${markets.length})`, {
      parse_mode: 'Markdown',
      reply_markup: marketsListKeyboard(markets),
    });
    return;
  }

  if (data.startsWith('markets:page:')) {
    const page = parseInt(data.split(':')[2], 10);
    const markets = sessionMarkets.get(ctx.from.id) ?? (await listMarkets('trending'));
    await ctx.editMessageText(`📊 *Markets* (page ${page + 1})`, {
      parse_mode: 'Markdown',
      reply_markup: marketsListKeyboard(markets, page),
    });
    return;
  }

  if (data === 'markets:back') {
    await ctx.editMessageText('📊 *Browse Markets*', {
      parse_mode: 'Markdown',
      reply_markup: categoryKeyboard(),
    });
    return;
  }

  if (data.startsWith('market:')) {
    const id = data.slice(7);
    const market = await getEnrichedMarket(id);
    if (!market) {
      await ctx.reply('Market not found.');
      return;
    }
    await ctx.editMessageText(formatMarketDetail(market), {
      parse_mode: 'Markdown',
      reply_markup: marketDetailKeyboard(market),
    });
  }
}

function titleForCategory(cat: string): string {
  const titles: Record<string, string> = {
    trending: '🔥 Trending',
    stock_tokens: '📈 Stock Tokens',
    sports: '🏆 Sports',
    crypto: '₿ Crypto',
    politics: '🏛️ Politics',
    entertainment: '🎬 Entertainment',
  };
  return titles[cat] ?? 'Markets';
}