import type { Context } from 'grammy';
import { randomBytes } from 'crypto';
import { buildSignMessage, isValidAddress, shortenAddress } from '../chain/wallet.js';
import { getUsdcBalance, getUserPositions } from '../chain/bets.js';
import { getMarketsWithContracts } from '../data/markets.js';
import { getEnrichedMarket } from '../chain/markets.js';
import { ensureUser, getUser, setWallet, setWalletNonce } from '../db/index.js';
import { recoverKeyboard, recoverRelinkKeyboard } from '../keyboards/index.js';
import { DISCLAIMER } from '../config.js';

const RECOVER_INTRO = (
  `🔄 *Account Recovery*\n\n` +
  `*Lost your Telegram account?* Your crypto is safe — it's on Robinhood Chain, not in Telegram.\n\n` +
  `*What you CAN recover here:*\n` +
  `✅ Re-link your wallet to this Telegram account\n` +
  `✅ View on-chain USDC balance & open positions\n` +
  `✅ Resume betting & portfolio tracking\n\n` +
  `*What HoodPredict CANNOT recover:*\n` +
  `❌ Private keys or seed phrases\n` +
  `❌ Old Telegram chat history or bot settings\n` +
  `❌ Premium status (contact support with payment proof)\n\n` +
  `*Lost your wallet seed phrase?* Restore via MetaMask/Rabby backup — not through this bot.\n\n` +
  `${DISCLAIMER}`
);

export async function recoverHandler(ctx: Context) {
  if (!ctx.from) return;
  ensureUser(ctx.from.id, ctx.from.username);

  const user = getUser(ctx.from.id);
  const linked = user?.wallet_verified && user.wallet_address;

  if (linked) {
    const summary = await buildOnChainRecoverySummary(user.wallet_address as `0x${string}`);
    await ctx.reply(
      `✅ *Wallet already linked*\n\n` +
        `👛 \`${shortenAddress(user.wallet_address!)}\`\n\n` +
        `${summary}\n\n` +
        `Need to link a *different* wallet? Tap below.`,
      { parse_mode: 'Markdown', reply_markup: recoverRelinkKeyboard(),
      },
    );
    return;
  }

  await ctx.reply(RECOVER_INTRO, {
    parse_mode: 'Markdown',
    reply_markup: recoverKeyboard(),
  });
}

export async function recoverCallback(ctx: Context) {
  const data = ctx.callbackQuery?.data;
  if (!data?.startsWith('recover:') || !ctx.from) return;
  await ctx.answerCallbackQuery();

  if (data === 'recover:start') {
    await ctx.editMessageText(
      `*Step 1 of 3 — Link wallet*\n\n` +
        `Send your Robinhood Chain address:\n` +
        `\`/wallet 0xYourAddress\`\n\n` +
        `Use the *same address* you bet with before.`,
      { parse_mode: 'Markdown', reply_markup: recoverRelinkKeyboard() },
    );
    return;
  }

  if (data === 'recover:verify') {
    await ctx.reply(
      `*Step 2 of 3 — Verify ownership*\n\n` +
        `1. Sign the message from \`/wallet\` in MetaMask/Rabby\n` +
        `2. Send the signature:\n` +
        `\`/verify 0xYourSignature\`\n\n` +
        `This proves you own the wallet — no gas fee.`,
      { parse_mode: 'Markdown' },
    );
    return;
  }

  if (data === 'recover:check') {
    const user = getUser(ctx.from.id);
    if (!user?.wallet_verified || !user.wallet_address) {
      await ctx.reply('Complete Steps 1–2 first, then tap Check again.', {
        reply_markup: recoverRelinkKeyboard(),
      });
      return;
    }

    const summary = await buildOnChainRecoverySummary(user.wallet_address as `0x${string}`);
    await ctx.reply(
      `*Step 3 — Recovery complete* 🎉\n\n` +
        `👛 \`${shortenAddress(user.wallet_address)}\`\n\n` +
        `${summary}\n\n` +
        `You're back! Try /portfolio and /markets.`,
      { parse_mode: 'Markdown', reply_markup: recoverRelinkKeyboard() },
    );
    return;
  }

  if (data === 'recover:seed') {
    await ctx.reply(
      `🔑 *Wallet seed phrase recovery*\n\n` +
        `HoodPredict never stores your private keys.\n\n` +
        `If you lost access to your wallet app:\n` +
        `1. Open MetaMask → "Import wallet"\n` +
        `2. Enter your *12/24-word seed phrase*\n` +
        `3. Come back and /recover to re-link\n\n` +
        `⚠️ *Never* type your seed phrase in Telegram or any bot.`,
      { parse_mode: 'Markdown' },
    );
  }
}

/** After /verify during recovery — optional enhanced confirmation */
export async function postVerifyRecovery(ctx: Context, address: string) {
  const summary = await buildOnChainRecoverySummary(address as `0x${string}`);
  await ctx.reply(
    `🔄 *Recovery update*\n\n` +
      `Wallet verified: \`${shortenAddress(address)}\`\n\n` +
      `${summary}\n\n` +
      `Tap /portfolio for full details.`,
    { parse_mode: 'Markdown', reply_markup: recoverRelinkKeyboard() },
  );
}

async function buildOnChainRecoverySummary(wallet: `0x${string}`): Promise<string> {
  const usdc = await getUsdcBalance(wallet);
  const lines = [`💵 USDC: *$${usdc.toFixed(2)}*`];

  const markets = getMarketsWithContracts().slice(0, 12);
  let positionCount = 0;

  for (const m of markets) {
    const enriched = await getEnrichedMarket(m.id);
    if (!enriched?.contractAddress) continue;
    const pos = await getUserPositions(enriched, wallet);
    for (const p of pos) {
      if (positionCount < 5) {
        lines.push(`📍 *${p.label}* — $${p.shares.toFixed(2)} on ${enriched.question.slice(0, 40)}…`);
      }
      positionCount++;
    }
  }

  if (positionCount === 0) {
    lines.push(`📊 On-chain positions: _none found in active markets_`);
  } else if (positionCount > 5) {
    lines.push(`_…and ${positionCount - 5} more. See /portfolio_`);
  } else {
    lines.push(`📊 *${positionCount}* active on-chain position(s)`);
  }

  return lines.join('\n');
}

/** Wizard: user pastes address during recover flow without /wallet prefix */
export async function recoverAddressHandler(ctx: Context): Promise<boolean> {
  if (!ctx.from || !ctx.message?.text) return false;

  const text = ctx.message.text.trim();
  if (!isValidAddress(text)) return false;

  // Only intercept bare 0x addresses (not commands)
  if (text.startsWith('/')) return false;

  setWallet(ctx.from.id, text, false);
  const nonce = randomBytes(16).toString('hex');
  setWalletNonce(ctx.from.id, nonce);
  const message = buildSignMessage(ctx.from.id, nonce);

  await ctx.reply(
    `✅ *Address linked for recovery*\n\n` +
      `\`${shortenAddress(text)}\`\n\n` +
      `Sign this message in your wallet:\n` +
      `\`\`\`\n${message}\n\`\`\`\n\n` +
      `Then: \`/verify 0xSignature\``,
    { parse_mode: 'Markdown' },
  );
  return true;
}