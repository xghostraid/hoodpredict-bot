import type { Context } from 'grammy';
import { config, DISCLAIMER, PREMIUM_FEATURES } from '../config.js';
import { ensureUser, getUser, grantPremium, isPremium, startTrial } from '../db/index.js';
import { premiumKeyboard } from '../keyboards/index.js';

export async function premiumHandler(ctx: Context) {
  if (!ctx.from) return;
  ensureUser(ctx.from.id, ctx.from.username);

  const user = getUser(ctx.from.id)!;
  const active = isPremium(ctx.from.id);
  const trialUsed = Boolean(user.trial_started_at);

  const status = active
    ? '💎 *Premium Active*'
    : '🆓 *Free Tier*';

  const features = PREMIUM_FEATURES.map((f) => `  ${f}`).join('\n');

  await ctx.reply(
    `${status}\n\n` +
      `*Premium — $${config.PREMIUM_MONTHLY_USD}/mo or $${config.PREMIUM_YEARLY_USD}/yr*\n\n` +
      `${features}\n\n` +
      (trialUsed
        ? '_Trial already used._ After paying, message support with your @username.\n'
        : '🆓 Tap below for a *7-day free trial* — no card required!\n') +
      `\n${DISCLAIMER}`,
    { parse_mode: 'Markdown', reply_markup: premiumKeyboard() },
  );
}

export async function premiumCallback(ctx: Context) {
  const data = ctx.callbackQuery?.data;
  if (!data || !ctx.from) return;

  if (data === 'premium:trial') {
    const ok = startTrial(ctx.from.id);
    await ctx.answerCallbackQuery({
      text: ok ? '🎉 7-day Premium trial activated!' : 'Trial already used',
      show_alert: true,
    });
    if (ok) {
      await ctx.reply(
        `🎉 *Welcome to Premium!*\n\n` +
          `Your 7-day trial is live. Try /ai to launch the AI Auto-Trader 🤖\n\n` +
          `${DISCLAIMER}`,
        { parse_mode: 'Markdown' },
      );
    }
  }
}

export async function grantHandler(ctx: Context) {
  if (!ctx.from || ctx.from.id !== config.ADMIN_USER_ID) {
    await ctx.reply('⛔ Admin only.');
    return;
  }

  const args = (ctx.message?.text ?? '').split(/\s+/).slice(1);
  if (args.length < 2) {
    await ctx.reply('Usage: `/grant <telegram_id> <days>`');
    return;
  }

  const [idStr, daysStr] = args;
  grantPremium(parseInt(idStr, 10), parseInt(daysStr, 10) || 30);
  await ctx.reply(`✅ Premium granted to ${idStr} for ${daysStr} days.`);
}