import type { Context } from 'grammy';
import { ensureUser, getUser, getSettings } from '../db/index.js';
import { referralKeyboard } from '../keyboards/index.js';

export async function referralsHandler(ctx: Context) {
  if (!ctx.from) return;
  ensureUser(ctx.from.id, ctx.from.username);
  const user = getUser(ctx.from.id)!;

  const me = await ctx.api.getMe();
  const link = `https://t.me/${me.username}?start=ref_${ctx.from.id}`;

  await ctx.reply(
    `🎁 *Refer & Earn*\n\n` +
      `Share HoodPredict — earn *5%* of your friends' platform fees.\n\n` +
      `📊 *Your stats*\n` +
      `• Friends referred: *${user.referrals_count}*\n` +
      `• Total earnings: *$${user.referral_earnings.toFixed(2)}*\n` +
      `• Your cashback: *${getSettings(ctx.from.id).cashbackPct}%* on every bet\n\n` +
      `🔗 *Your link:*\n\`${link}\`\n\n` +
      `_Like Based Bot referrals — but for prediction markets on Robinhood Chain._`,
    { parse_mode: 'Markdown', reply_markup: referralKeyboard(link),
    },
  );
}

export async function shareReferralCallback(ctx: Context) {
  if (!ctx.from) return;
  await ctx.answerCallbackQuery();
  const me = await ctx.api.getMe();
  const link = `https://t.me/${me.username}?start=ref_${ctx.from.id}`;
  await ctx.reply(
    `📤 Share this with friends:\n\n` +
      `\`${link}\`\n\n` +
      `They get prediction markets + AI trader.\nYou earn 5% of their fees.`,
    { parse_mode: 'Markdown' },
  );
}