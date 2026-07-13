import type { Context } from 'grammy';
import { getLeaderboard } from '../db/index.js';
import { TOP_WHALES } from '../data/whales.js';
import { leaderboardKeyboard } from '../keyboards/index.js';

export async function leaderboardHandler(ctx: Context) {
  const platform = getLeaderboard(8);
  const lines = [`🏆 *HoodPredict Leaderboard*\n`, `_Top predictors by volume_\n`];

  if (platform.length) {
    platform.forEach((u, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      const name = u.username ? `@${u.username}` : `User ${u.telegramId}`;
      const wr = u.bets ? Math.round((u.wins / u.bets) * 100) : 0;
      lines.push(`${medal} ${name} — $${u.volume.toFixed(0)} vol · ${wr}% win`);
    });
  } else {
    lines.push('_Be the first on the board — place a bet!_');
  }

  lines.push('\n🐋 *Legend whales* (copy-trade targets)');
  for (const w of TOP_WHALES.slice(0, 3)) {
    lines.push(`${w.emoji} ${w.handle} — ${w.winRate}% · $${(w.volumeUsd / 1000).toFixed(0)}K`);
  }

  await ctx.reply(lines.join('\n'), {
    parse_mode: 'Markdown',
    reply_markup: leaderboardKeyboard(),
  });
}