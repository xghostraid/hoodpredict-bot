import type { Context } from 'grammy';
import { config, DISCLAIMER } from '../config.js';
import { ensureUser } from '../db/index.js';

export async function createHandler(ctx: Context) {
  if (!ctx.from) return;
  ensureUser(ctx.from.id, ctx.from.username);

  await ctx.reply(
    `✨ *Create a Market*\n\n` +
      `Launch your own prediction market on Robinhood Chain!\n\n` +
      `*Requirements:*\n` +
      `• Connected wallet with USDC for liquidity\n` +
      `• Clear resolution criteria\n` +
      `• 2–8 outcomes (Yes/No or multi-outcome)\n\n` +
      `*Via HoodPredict Web:*\n` +
      `[🚀 Create Market](${config.WEB_APP_URL}/create)\n\n` +
      `*Via bot (coming soon):*\n` +
      `Send market details in this format:\n` +
      `\`\`\`\n` +
      `Question: Will XYZ happen?\n` +
      `Category: sports\n` +
      `Outcomes: Team A, Team B\n` +
      `End: 2026-12-31\n` +
      `\`\`\`\n\n` +
      `Premium creators get featured placement 📣\n\n${DISCLAIMER}`,
    {
      parse_mode: 'Markdown',
      link_preview_options: { is_disabled: true },
    },
  );
}