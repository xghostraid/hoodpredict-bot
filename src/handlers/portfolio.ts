import type { Context } from 'grammy';
import { ensureUser } from '../db/index.js';
import { buildPortfolioSummary } from '../services/portfolio.js';

export async function portfolioHandler(ctx: Context) {
  if (!ctx.from) return;
  ensureUser(ctx.from.id, ctx.from.username);

  const summary = await buildPortfolioSummary(ctx.from.id);
  await ctx.reply(summary, { parse_mode: 'Markdown' });
}