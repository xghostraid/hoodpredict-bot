import type { Context } from 'grammy';
import { randomBytes } from 'crypto';
import {
  buildSignMessage,
  isValidAddress,
  shortenAddress,
  verifyWalletSignature,
} from '../chain/wallet.js';
import {
  CUSTODIAL_NOTICE,
  createWallet,
  encryptCredential,
  decryptCredential,
  parseImportInput,
} from '../chain/vault.js';
import {
  ensureUser,
  getUser,
  getWalletNonce,
  setWallet,
  setWalletNonce,
  setCustodialWallet,
  clearWallet,
  getCustodialCredential,
  hasCustodialWallet,
} from '../db/index.js';
import { walletKeyboard, walletCreatedKeyboard } from '../keyboards/index.js';

/** Pending wallet creation awaiting user backup confirmation */
const pendingCreate = new Map<number, { address: `0x${string}`; mnemonic: string }>();
/** Users in import flow */
const pendingImport = new Set<number>();

function walletStatus(user: ReturnType<typeof getUser>): string {
  if (!user?.wallet_address) return '_No wallet set up_';
  const addr = `\`${shortenAddress(user.wallet_address)}\``;
  if (user.wallet_mode === 'custodial') {
    return `🔐 HoodPredict wallet ${addr} ✅`;
  }
  if (user.wallet_verified) return `✅ External wallet ${addr}`;
  return `⏳ Pending verify ${addr}`;
}

export async function walletHandler(ctx: Context) {
  if (!ctx.from) return;
  ensureUser(ctx.from.id, ctx.from.username);
  const user = getUser(ctx.from.id);

  await ctx.reply(`${CUSTODIAL_NOTICE}\n\n👛 *Your Wallet*\n${walletStatus(user)}`, {
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
    `✅ External address saved: \`${shortenAddress(addr)}\`\n\n` +
      `Sign this message in your wallet:\n\n` +
      `\`\`\`\n${message}\n\`\`\`\n\n` +
      `Then: \`/verify <signature>\``,
    { parse_mode: 'Markdown' },
  );
}

export async function importCommand(ctx: Context) {
  if (!ctx.from) return;
  pendingImport.add(ctx.from.id);
  await ctx.reply(
    `📥 *Import Wallet*\n\n` +
      `Send your *seed phrase* (12/24 words) or *private key* (0x…)\n\n` +
      `⚠️ Message will be deleted after import.\n` +
      `🔐 Encrypted and stored for in-bot betting.`,
    { parse_mode: 'Markdown' },
  );
}

export async function exportCommand(ctx: Context) {
  if (!ctx.from) return;
  const user = getUser(ctx.from.id);
  const blob = getCustodialCredential(ctx.from.id);

  if (!user || user.wallet_mode !== 'custodial' || !blob) {
    await ctx.reply('No HoodPredict wallet to export. Create or import one via /wallet');
    return;
  }

  try {
    const cred = decryptCredential(ctx.from.id, blob);
    const value = cred.type === 'mnemonic' ? cred.value : cred.value;
    const label = cred.type === 'mnemonic' ? 'Seed phrase' : 'Private key';

    await ctx.reply(
      `🔑 *Wallet backup* — \`${shortenAddress(user.wallet_address!)}\`\n\n` +
        `*${label}:*\n\`${value}\`\n\n` +
        `⚠️ *Save this now.* Anyone with this can steal your funds.\n` +
        `Delete this message after saving.`,
      { parse_mode: 'Markdown' },
    );
  } catch {
    await ctx.reply('❌ Could not decrypt wallet. Contact support.');
  }
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
  await ctx.reply('🎉 *External wallet verified!*', { parse_mode: 'Markdown' });

  const { postVerifyRecovery } = await import('./recover.js');
  await postVerifyRecovery(ctx, user.wallet_address);
}

export async function walletCallback(ctx: Context) {
  const data = ctx.callbackQuery?.data;
  if (!data || !ctx.from) return;
  await ctx.answerCallbackQuery();

  if (data === 'wallet:create') {
    const { address, mnemonic } = createWallet();
    pendingCreate.set(ctx.from.id, { address, mnemonic });
    await ctx.reply(
      `✨ *New wallet created!*\n\n` +
        `📍 Address: \`${address}\`\n\n` +
        `🌱 *Seed phrase (save offline NOW):*\n\`${mnemonic}\`\n\n` +
        `⚠️ HoodPredict cannot recover this if you lose it.\n` +
        `Tap *I've saved my seed* only after writing it down.`,
      { parse_mode: 'Markdown', reply_markup: walletCreatedKeyboard() },
    );
    return;
  }

  if (data === 'wallet:confirm_create') {
    const pending = pendingCreate.get(ctx.from.id);
    if (!pending) {
      await ctx.reply('No pending wallet. Tap ✨ Create new wallet.');
      return;
    }

    const encrypted = encryptCredential(ctx.from.id, {
      type: 'mnemonic',
      value: pending.mnemonic,
    });
    setCustodialWallet(ctx.from.id, pending.address, encrypted);
    pendingCreate.delete(ctx.from.id);

    await ctx.reply(
      `🎉 *HoodPredict wallet activated!*\n\n` +
        `👛 \`${shortenAddress(pending.address)}\`\n\n` +
        `You can bet instantly from the bot.\n` +
        `Get testnet USDC from the [Robinhood faucet](https://faucet.testnet.chain.robinhood.com).`,
      { parse_mode: 'Markdown' },
    );
    return;
  }

  if (data === 'wallet:cancel_create') {
    pendingCreate.delete(ctx.from.id);
    await ctx.reply('Wallet creation cancelled.');
    return;
  }

  if (data === 'wallet:import') {
    pendingImport.add(ctx.from.id);
    await ctx.reply(
      `📥 *Import wallet*\n\n` +
        `Send your seed phrase or private key in the next message.\n` +
        `_(Message auto-deleted after import)_`,
      { parse_mode: 'Markdown' },
    );
    return;
  }

  if (data === 'wallet:link') {
    await ctx.reply('Link external wallet:\n`/wallet 0xYourAddress`', { parse_mode: 'Markdown' });
    return;
  }

  if (data === 'wallet:verify') {
    await ctx.reply('After signing:\n`/verify 0xSignature`', { parse_mode: 'Markdown' });
    return;
  }

  if (data === 'wallet:export') {
    await exportCommand(ctx);
    return;
  }

  if (data === 'wallet:remove') {
    clearWallet(ctx.from.id);
    pendingCreate.delete(ctx.from.id);
    pendingImport.delete(ctx.from.id);
    await ctx.reply('🗑 Wallet removed from HoodPredict.');
    return;
  }
}

/** Handle seed phrase / private key import messages */
export async function importTextHandler(ctx: Context): Promise<boolean> {
  if (!ctx.from || !ctx.message?.text || !pendingImport.has(ctx.from.id)) return false;

  const text = ctx.message.text.trim();
  if (text.startsWith('/')) return false;

  const msgId = ctx.message.message_id;
  const chatId = ctx.chat?.id;

  const credential = parseImportInput(text);
  if (!credential) {
    await ctx.reply('❌ Invalid format. Send 12/24-word seed phrase or 0x private key.');
    return true;
  }

  try {
    const { accountFromCredential } = await import('../chain/vault.js');
    const account = accountFromCredential(credential);
    const encrypted = encryptCredential(ctx.from.id, credential);
    setCustodialWallet(ctx.from.id, account.address, encrypted);
    pendingImport.delete(ctx.from.id);

    if (chatId) {
      try {
        await ctx.api.deleteMessage(chatId, msgId);
      } catch {
        /* already deleted or too old */
      }
    }

    await ctx.reply(
      `✅ *Wallet imported!*\n\n` +
        `👛 \`${shortenAddress(account.address)}\`\n\n` +
        `Encrypted and ready for in-bot betting.\n` +
        `Export backup anytime: /export`,
      { parse_mode: 'Markdown' },
    );
  } catch {
    await ctx.reply('❌ Import failed. Check your key and try again.');
  }
  return true;
}

