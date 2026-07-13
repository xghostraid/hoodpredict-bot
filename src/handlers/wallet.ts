import type { Context } from 'grammy';
import { randomBytes } from 'crypto';
import {
  buildSignMessage,
  isValidAddress,
  verifyWalletSignature,
  WALLET_WARNING,
} from '../chain/wallet.js';
import {
  ensureUser,
  getUser,
  getWalletNonce,
  setWallet,
  setWalletNonce,
} from '../db/index.js';
import { walletKeyboard } from '../keyboards/index.js';

export async function walletHandler(ctx: Context) {
  if (!ctx.from) return;
  ensureUser(ctx.from.id, ctx.from.username);
  const user = getUser(ctx.from.id);

  const status = user?.wallet_verified
    ? `✅ Verified: \`${user.wallet_address}\``
    : user?.wallet_address
      ? `⏳ Pending verification: \`${user.wallet_address}\``
      : '_No wallet linked_';

  await ctx.reply(`${WALLET_WARNING}\n\n👛 *Your Wallet*\n${status}`, {
    parse_mode: 'Markdown',
    reply_markup: walletKeyboard(),
  });
}

export async function walletCommand(ctx: Context) {
  const addr = (ctx.message?.text ?? '').split(/\s+/)[1]?.trim();
  if (!addr || !ctx.from) {
    await walletHandler(ctx);
    return;
  }

  if (!isValidAddress(addr)) {
    await ctx.reply('❌ Invalid address. Use format `0x...`', { parse_mode: 'Markdown' });
    return;
  }

  setWallet(ctx.from.id, addr, false);
  const nonce = randomBytes(16).toString('hex');
  setWalletNonce(ctx.from.id, nonce);
  const message = buildSignMessage(ctx.from.id, nonce);

  await ctx.reply(
    `✅ Address saved: \`${addr}\`\n\n` +
      `Sign this message in your wallet to verify:\n\n` +
      `\`\`\`\n${message}\n\`\`\`\n\n` +
      `Then send: \`/verify <signature>\``,
    { parse_mode: 'Markdown' },
  );
}

export async function verifyCommand(ctx: Context) {
  const sig = (ctx.message?.text ?? '').split(/\s+/)[1]?.trim();
  if (!sig || !ctx.from) {
    await ctx.reply('Usage: `/verify 0x...`', { parse_mode: 'Markdown' });
    return;
  }

  const user = getUser(ctx.from.id);
  const nonce = getWalletNonce(ctx.from.id);
  if (!user?.wallet_address || !nonce) {
    await ctx.reply('Link wallet first: `/wallet 0xYourAddress`', { parse_mode: 'Markdown' });
    return;
  }

  const message = buildSignMessage(ctx.from.id, nonce);
  const ok = await verifyWalletSignature(
    user.wallet_address as `0x${string}`,
    message,
    sig as `0x${string}`,
  );

  if (!ok) {
    await ctx.reply('❌ Signature verification failed.');
    return;
  }

  setWallet(ctx.from.id, user.wallet_address, true);
  await ctx.reply('🎉 *Wallet verified!* You can now place bets on-chain.', {
    parse_mode: 'Markdown',
  });

  const { postVerifyRecovery } = await import('./recover.js');
  await postVerifyRecovery(ctx, user.wallet_address);
}

export async function walletCallback(ctx: Context) {
  const data = ctx.callbackQuery?.data;
  if (!data || !ctx.from) return;
  await ctx.answerCallbackQuery();

  if (data === 'wallet:link') {
    await ctx.reply(
      'Send your Robinhood Chain wallet address:\n`/wallet 0xYourAddress`',
      { parse_mode: 'Markdown' },
    );
  } else if (data === 'wallet:verify') {
    await ctx.reply(
      'After signing the verification message, send:\n`/verify 0xSignature`',
      { parse_mode: 'Markdown' },
    );
  }
}