import type { Context } from 'grammy';
import { config } from '../config.js';
import { getEnrichedMarket } from '../chain/markets.js';
import { betAmountKeyboard, instantBetKeyboard } from '../keyboards/index.js';
import { getSettings } from '../db/index.js';
import {
  estimatePayout,
  formatBetInstructions,
  verifyBetTx,
  type BetIntent,
} from '../chain/bets.js';
import {
  confirmBet,
  ensureUser,
  getUser,
  getUserBets,
  saveBet,
  hasCustodialWallet,
  getCustodialCredential,
} from '../db/index.js';
import { executeCustodialBet, explorerTxUrl } from '../chain/bets.js';
import { formatMarketCard } from '../formatters/markets.js';

const pendingAmount = new Map<number, { marketId: string; outcomeIndex: number }>();

export async function myBetsHandler(ctx: Context) {
  if (!ctx.from) return;
  ensureUser(ctx.from.id, ctx.from.username);

  const bets = getUserBets(ctx.from.id);
  if (!bets.length) {
    await ctx.reply(
      '🎯 *No bets yet!*\n\nBrowse /markets and place your first prediction 🍀',
      { parse_mode: 'Markdown' },
    );
    return;
  }

  const lines = ['🎯 *My Bets*\n'];
  for (const b of bets.slice(0, 10)) {
    const emoji =
      b.status === 'active' ? '🟢' : b.status === 'won' ? '✅' : b.status === 'lost' ? '❌' : '⏳';
    lines.push(
      `${emoji} *${b.outcomeLabel}* on ${b.marketQuestion.slice(0, 45)}…\n` +
        `   $${b.amount} → est. $${b.potentialPayout.toFixed(0)} · _${b.status}_`,
    );
  }

  await ctx.reply(lines.join('\n\n'), { parse_mode: 'Markdown' });
}

export async function betCallback(ctx: Context) {
  const data = ctx.callbackQuery?.data;
  if (!data || !ctx.from) return;
  await ctx.answerCallbackQuery();

  if (data.startsWith('bet:')) {
    const [, marketId, outcomeStr] = data.split(':');
    const outcomeIndex = parseInt(outcomeStr, 10);
    const market = await getEnrichedMarket(marketId);
    if (!market) return;

    const outcome = market.outcomes[outcomeIndex];
    await ctx.editMessageText(
      `💰 *Place Bet*\n\n${formatMarketCard(market, true)}\n\n` +
        `Pick: *${outcome?.label}* (${outcome?.probability}%)\n\n` +
        `Select amount (USDC):`,
      {
        parse_mode: 'Markdown',
        reply_markup: betAmountKeyboard(
          marketId,
          outcomeIndex,
          ctx.from ? getSettings(ctx.from.id).quickBets : undefined,
        ),
      },
    );
    return;
  }

  if (data.startsWith('amt:')) {
    const parts = data.split(':');
    if (parts[1] === 'custom') {
      const marketId = parts[2];
      const outcomeIndex = parseInt(parts[3], 10);
      pendingAmount.set(ctx.from.id, { marketId, outcomeIndex });
      await ctx.reply('✏️ Enter bet amount in USD (e.g. `75`):', { parse_mode: 'Markdown' });
      return;
    }

    const marketId = parts[1];
    const outcomeIndex = parseInt(parts[2], 10);
    const amount = parseFloat(parts[3]);
    await placeBetFlow(ctx, marketId, outcomeIndex, amount);
  }
}

export async function customAmountHandler(ctx: Context): Promise<boolean> {
  if (!ctx.from || !ctx.message?.text) return false;
  const pending = pendingAmount.get(ctx.from.id);
  if (!pending) return false;

  const amount = parseFloat(ctx.message.text.replace(/[$,]/g, ''));
  if (isNaN(amount) || amount < 1 || amount > 10_000) {
    await ctx.reply('Enter a valid amount between $1 and $10,000.');
    return true;
  }

  pendingAmount.delete(ctx.from.id);
  await placeBetFlow(ctx, pending.marketId, pending.outcomeIndex, amount);
  return true;
}

export async function placeBetFlow(
  ctx: Context,
  marketId: string,
  outcomeIndex: number,
  amountUsd: number,
) {
  if (!ctx.from) return;
  ensureUser(ctx.from.id, ctx.from.username);

  const market = await getEnrichedMarket(marketId);
  if (!market?.contractAddress) {
    await ctx.reply('❌ Market not available on-chain yet.');
    return;
  }

  const outcome = market.outcomes[outcomeIndex];
  const payout = estimatePayout(market, outcomeIndex, amountUsd);
  const user = getUser(ctx.from.id);

  const intent: BetIntent = {
    marketId,
    contractAddress: market.contractAddress as `0x${string}`,
    outcomeIndex,
    outcomeLabel: outcome.label,
    amountUsd,
    question: market.question,
  };

  saveBet({
    telegramId: ctx.from.id,
    marketId,
    marketQuestion: market.question,
    outcomeIndex,
    outcomeLabel: outcome.label,
    amount: amountUsd,
    collateral: market.collateral,
    potentialPayout: payout,
    status: 'pending',
    contractAddress: market.contractAddress,
    placedAt: new Date().toISOString(),
  });

  const custodial = hasCustodialWallet(ctx.from.id);
  const replyMarkup = custodial
    ? instantBetKeyboard(marketId, outcomeIndex, amountUsd)
    : undefined;

  await ctx.reply(
    formatBetInstructions(intent, user?.wallet_address ?? undefined, custodial) +
      `\n\n💰 Est. payout if win: *$${payout.toFixed(2)}*`,
    {
      parse_mode: 'Markdown',
      link_preview_options: { is_disabled: true },
      reply_markup: replyMarkup,
    },
  );
}

export async function instantBetCallback(ctx: Context) {
  const data = ctx.callbackQuery?.data;
  if (!data?.startsWith('instant:') || !ctx.from) return;

  const [, marketId, outcomeStr, amountStr] = data.split(':');
  const outcomeIndex = parseInt(outcomeStr, 10);
  const amountUsd = parseFloat(amountStr);

  const blob = getCustodialCredential(ctx.from.id);
  if (!blob) {
    await ctx.answerCallbackQuery({ text: 'Set up wallet first: /wallet', show_alert: true });
    return;
  }

  const market = await getEnrichedMarket(marketId);
  if (!market?.contractAddress) return;

  await ctx.answerCallbackQuery({ text: '⏳ Signing on-chain…' });

  const intent = {
    marketId,
    contractAddress: market.contractAddress as `0x${string}`,
    outcomeIndex,
    outcomeLabel: market.outcomes[outcomeIndex].label,
    amountUsd,
    question: market.question,
  };

  try {
    const { txHash } = await executeCustodialBet(ctx.from.id, blob, intent);
    const payout = estimatePayout(market, outcomeIndex, amountUsd);

    saveBet({
      telegramId: ctx.from.id,
      marketId,
      marketQuestion: market.question,
      outcomeIndex,
      outcomeLabel: intent.outcomeLabel,
      amount: amountUsd,
      collateral: market.collateral,
      potentialPayout: payout,
      status: 'active',
      txHash,
      contractAddress: market.contractAddress,
      placedAt: new Date().toISOString(),
    });

    await ctx.reply(
      `🎉 *Bet placed on-chain!*\n\n` +
        `✅ ${intent.outcomeLabel} — $${amountUsd} on ${market.question.slice(0, 50)}…\n` +
        `🔗 [View tx](${explorerTxUrl(txHash)})`,
      { parse_mode: 'Markdown' },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Transaction failed';
    await ctx.reply(
      `❌ Bet failed: ${msg.slice(0, 120)}\n\n` +
        `Ensure you have ${config.COLLATERAL_SYMBOL} + ETH for gas.`,
      { parse_mode: 'Markdown' },
    );
  }
}

function commandArgs(ctx: Context): string[] {
  const text = ctx.message?.text ?? '';
  return text.split(/\s+/).slice(1);
}

export async function confirmHandler(ctx: Context) {
  const args = commandArgs(ctx);
  if (args.length < 2 || !ctx.from) {
    await ctx.reply('Usage: `/confirm m1 0xabc123...`', { parse_mode: 'Markdown' });
    return;
  }

  const [marketId, txHash] = args;
  const user = getUser(ctx.from.id);
  if (!user?.wallet_address) {
    await ctx.reply('Link wallet first: /wallet');
    return;
  }

  const market = await getEnrichedMarket(marketId);
  if (!market?.contractAddress) return;

  const ok = await verifyBetTx(
    txHash as `0x${string}`,
    user.wallet_address as `0x${string}`,
    market.contractAddress as `0x${string}`,
  );

  if (!ok) {
    await ctx.reply('❌ Could not verify transaction. Check hash and try again.');
    return;
  }

  const bet = confirmBet(ctx.from.id, marketId, txHash);
  if (!bet) {
    await ctx.reply('No pending bet found for this market.');
    return;
  }

  await ctx.reply(
    `🎉 *Bet confirmed on-chain!*\n\n` +
      `✅ ${bet.outcomeLabel} — $${bet.amount} on ${market.question.slice(0, 50)}…\n` +
      `🔗 \`${txHash.slice(0, 18)}…\``,
    { parse_mode: 'Markdown' },
  );
}

export async function subscribeCallback(ctx: Context) {
  const data = ctx.callbackQuery?.data;
  if (!data?.startsWith('sub:') || !ctx.from) return;
  await ctx.answerCallbackQuery({ text: '🔔 Subscribed!' });

  const marketId = data.slice(4);
  const { subscribeMarket } = await import('../db/index.js');
  subscribeMarket(ctx.from.id, marketId);
}