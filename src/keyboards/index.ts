import { InlineKeyboard } from 'grammy';
import type { Market } from '../types.js';
import { config } from '../config.js';
import { TOP_WHALES } from '../data/whales.js';

export const MAIN_MENU = [
  ['⚡ Quick Bet', '📊 Markets', '💼 Portfolio'],
  ['🎯 My Bets', '🏆 Leaderboard', '🐋 Copy Whales'],
  ['📋 Limit Orders', '👛 Wallet', '⚙️ Settings'],
  ['🎁 Refer & Earn', '💎 Premium', '🤖 AI Trader'],
  ['❓ Help'],
];

export function mainMenuKeyboard() {
  return {
    keyboard: MAIN_MENU,
    resize_keyboard: true,
    input_field_placeholder: 'Pick a market or command…',
  };
}

export function categoryKeyboard() {
  return new InlineKeyboard()
    .text('🔥 Trending', 'cat:trending')
    .text('📈 Stocks', 'cat:stock_tokens')
    .row()
    .text('🏆 Sports', 'cat:sports')
    .text('₿ Crypto', 'cat:crypto')
    .row()
    .text('🏛️ Politics', 'cat:politics')
    .text('🎬 Entertainment', 'cat:entertainment')
    .row()
    .text('🔍 Search', 'search:prompt');
}

export function marketsListKeyboard(markets: Market[], page = 0, pageSize = 5) {
  const kb = new InlineKeyboard();
  const slice = markets.slice(page * pageSize, (page + 1) * pageSize);

  for (const m of slice) {
    const live = m.isLive ? '🔴 ' : '';
    const label = `${live}${m.id.toUpperCase()}: ${m.question.slice(0, 35)}…`;
    kb.text(label, `market:${m.id}`).row();
  }

  const totalPages = Math.ceil(markets.length / pageSize);
  if (totalPages > 1) {
    if (page > 0) kb.text('⬅️ Prev', `markets:page:${page - 1}`);
    kb.text(`${page + 1}/${totalPages}`, 'noop');
    if (page < totalPages - 1) kb.text('Next ➡️', `markets:page:${page + 1}`);
    kb.row();
  }

  kb.text('🔄 Refresh', 'cat:refresh').text('🏠 Menu', 'menu:home');
  return kb;
}

export function marketDetailKeyboard(market: Market) {
  const kb = new InlineKeyboard();
  for (let i = 0; i < market.outcomes.length; i++) {
    const o = market.outcomes[i];
    kb.text(`🎯 ${o.label} (${o.probability}%)`, `bet:${market.id}:${i}`).row();
  }
  kb.text('🔔 Notify on resolve', `sub:${market.id}`)
    .text('📈 AI Forecast', `forecast:${market.id}`)
    .row()
    .text('⬅️ Back', 'markets:back');
  return kb;
}

export function betAmountKeyboard(
  marketId: string,
  outcomeIndex: number,
  amounts: number[] = [10, 25, 50, 100],
) {
  const kb = new InlineKeyboard();
  for (const a of amounts.slice(0, 3)) {
    kb.text(`$${a}`, `amt:${marketId}:${outcomeIndex}:${a}`);
  }
  kb.row();
  for (const a of amounts.slice(3, 5)) {
    kb.text(`$${a}`, `amt:${marketId}:${outcomeIndex}:${a}`);
  }
  kb.row();
  return kb
    .text('Custom ✏️', `amt:custom:${marketId}:${outcomeIndex}`)
    .row()
    .text('📋 Limit order', `order:setup:${marketId}:${outcomeIndex}`)
    .text('⬅️ Back', `market:${marketId}`);
}

export function hubKeyboard() {
  return new InlineKeyboard()
    .text('⚡ Quick Bet', 'hub:quick')
    .text('📊 Markets', 'hub:markets')
    .row()
    .text('🐋 Copy Whales', 'hub:copy')
    .text('📋 Limit Orders', 'hub:orders')
    .row()
    .text('👛 Wallet', 'hub:wallet')
    .text('🎁 Refer & Earn', 'hub:refer')
    .row()
    .url('🌐 Web Terminal', config.WEB_APP_URL);
}

export function quickBetKeyboard(
  markets: Market[],
  defaultAmount: number,
) {
  const kb = new InlineKeyboard();
  for (const m of markets.slice(0, 3)) {
    const fav = m.outcomes.reduce(
      (best, o, i) => (o.probability > m.outcomes[best].probability ? i : best),
      0,
    );
    const label = m.isLive ? `🔴 ${m.id}` : m.id;
    kb.text(`⚡ ${label} $${defaultAmount}`, `quick:${m.id}:${fav}:${defaultAmount}`).row();
  }
  kb.text('📊 All markets', 'hub:markets').text('🏠 Hub', 'menu:home');
  return kb;
}

export function referralKeyboard(link: string) {
  return new InlineKeyboard()
    .url('📤 Share link', `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Bet on prediction markets on Robinhood Chain 🏹')}`)
    .row()
    .text('🏠 Hub', 'menu:home');
}

export function leaderboardKeyboard() {
  return new InlineKeyboard()
    .text('🐋 Copy whales', 'hub:copy')
    .text('⚡ Quick bet', 'hub:quick')
    .row()
    .text('🏠 Hub', 'menu:home');
}

export function copyWhaleKeyboard() {
  const kb = new InlineKeyboard();
  for (const w of TOP_WHALES) {
    kb.text(`👁 ${w.handle}`, `whale:watch:${w.id}`)
      .text(`⚡ Copy`, `whale:copy:${w.id}`)
      .row();
  }
  kb.text('🏠 Hub', 'menu:home');
  return kb;
}

export function settingsKeyboard(s: { notifyResolve: boolean; notifyWhale: boolean }, testnet = false) {
  const kb = new InlineKeyboard()
    .text(`🔔 Resolve: ${s.notifyResolve ? 'ON' : 'OFF'}`, 'set:toggle_resolve')
    .text(`🐋 Whales: ${s.notifyWhale ? 'ON' : 'OFF'}`, 'set:toggle_whale')
    .row();
  if (testnet) kb.text('🚰 Testnet faucet', 'set:faucet');
  return kb.text('🏠 Hub', 'menu:home');
}

export function ordersKeyboard() {
  return new InlineKeyboard()
    .text('➕ New order', 'order:new')
    .text('📊 Markets', 'hub:markets')
    .row()
    .text('🏠 Hub', 'menu:home');
}

export function premiumKeyboard() {
  return new InlineKeyboard()
    .url(`⚡ $${config.PREMIUM_MONTHLY_USD}/mo`, config.STRIPE_MONTHLY_LINK)
    .url(`🎁 $${config.PREMIUM_YEARLY_USD}/yr (save 26%)`, config.STRIPE_YEARLY_LINK)
    .row()
    .text('🆓 Start 7-day free trial', 'premium:trial')
    .row()
    .text('🤖 AI Trader preview', 'ai:preview');
}

export function aiTraderKeyboard() {
  return new InlineKeyboard()
    .text('🔍 Scan markets', 'ai:scan')
    .text('⚙️ Edit rules', 'ai:rules')
    .row()
    .text('📊 Performance', 'ai:stats')
    .text('✅ Approve pending', 'ai:pending')
    .row()
    .text('🏠 Menu', 'menu:home');
}

export function aiSuggestionKeyboard(tradeId: string, marketId: string, outcomeIndex: number, amount: number) {
  return new InlineKeyboard()
    .text('✅ Approve & bet', `ai:approve:${tradeId}:${marketId}:${outcomeIndex}:${amount}`)
    .row()
    .text('❌ Skip', `ai:reject:${tradeId}`)
    .text('⚙️ Rules', 'ai:rules');
}

export function walletKeyboard() {
  return new InlineKeyboard()
    .text('✨ Create wallet', 'wallet:create')
    .text('📥 Import wallet', 'wallet:import')
    .row()
    .text('🔗 Link external', 'wallet:link')
    .text('✍️ Verify', 'wallet:verify')
    .row()
    .text('🔑 Export backup', 'wallet:export')
    .text('🗑 Remove', 'wallet:remove')
    .row()
    .text('🔄 Recovery', 'recover:start')
    .url('🌐 Web app', config.WEB_APP_URL);
}

export function walletCreatedKeyboard() {
  return new InlineKeyboard()
    .text("✅ I've saved my seed", 'wallet:confirm_create')
    .row()
    .text('❌ Cancel', 'wallet:cancel_create');
}

export function instantBetKeyboard(marketId: string, outcomeIndex: number, amount: number) {
  return new InlineKeyboard()
    .text('⚡ Bet instantly', `instant:${marketId}:${outcomeIndex}:${amount}`)
    .row()
    .text('⬅️ Back', `market:${marketId}`);
}

export function recoverKeyboard() {
  return new InlineKeyboard()
    .text('▶️ Start recovery', 'recover:start')
    .row()
    .text('🔑 Lost seed phrase?', 'recover:seed')
    .text('✅ Check my wallet', 'recover:check');
}

export function recoverRelinkKeyboard() {
  return new InlineKeyboard()
    .text('🔗 Link wallet', 'recover:start')
    .text('✍️ Verify', 'recover:verify')
    .row()
    .text('✅ Check recovery', 'recover:check')
    .text('🏠 Menu', 'menu:home');
}