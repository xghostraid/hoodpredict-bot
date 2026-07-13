import { InlineKeyboard } from 'grammy';
import type { Market } from '../types.js';
import { config } from '../config.js';

export const MAIN_MENU = [
  ['📊 Markets', '🎯 My Bets'],
  ['💼 Portfolio', '🔔 Alerts'],
  ['💎 Premium', '🤖 AI Trader'],
  ['👛 Wallet', '❓ Help'],
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

export function betAmountKeyboard(marketId: string, outcomeIndex: number) {
  return new InlineKeyboard()
    .text('$10', `amt:${marketId}:${outcomeIndex}:10`)
    .text('$25', `amt:${marketId}:${outcomeIndex}:25`)
    .text('$50', `amt:${marketId}:${outcomeIndex}:50`)
    .row()
    .text('$100', `amt:${marketId}:${outcomeIndex}:100`)
    .text('$250', `amt:${marketId}:${outcomeIndex}:250`)
    .text('Custom ✏️', `amt:custom:${marketId}:${outcomeIndex}`)
    .row()
    .text('⬅️ Back', `market:${marketId}`);
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
    .text('🔗 Link address', 'wallet:link')
    .text('✍️ Verify signature', 'wallet:verify')
    .row()
    .text('🔄 Account recovery', 'recover:start')
    .row()
    .url('🌐 Open HoodPredict', config.WEB_APP_URL);
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