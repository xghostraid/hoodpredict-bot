import { getUserBets, getUser, isPremium } from '../db/index.js';
import { getEnrichedMarket } from '../chain/markets.js';
import { getUsdcBalance, getUserPositions } from '../chain/bets.js';
import { shortenAddress } from '../chain/wallet.js';

export async function buildPortfolioSummary(telegramId: number): Promise<string> {
  const user = getUser(telegramId);
  const bets = getUserBets(telegramId);
  const active = bets.filter((b) => b.status === 'active');
  const won = bets.filter((b) => b.status === 'won');
  const lost = bets.filter((b) => b.status === 'lost');

  const totalStaked = active.reduce((s, b) => s + b.amount, 0);
  const potentialWin = active.reduce((s, b) => s + b.potentialPayout, 0);
  const realizedPnl = won.reduce((s, b) => s + b.potentialPayout - b.amount, 0)
    - lost.reduce((s, b) => s + b.amount, 0);

  let walletLine = '👛 Wallet: _not linked_ — /wallet';
  let usdcLine = '';

  if (user?.wallet_address && user.wallet_verified) {
    const bal = await getUsdcBalance(user.wallet_address as `0x${string}`);
    walletLine = `👛 \`${shortenAddress(user.wallet_address)}\` ✅`;
    usdcLine = `💵 USDC balance: *$${bal.toFixed(2)}*`;
  }

  const tier = isPremium(telegramId) ? '💎 Premium' : '🆓 Free';

  const lines = [
    `💼 *Portfolio Summary*`,
    ``,
    walletLine,
    usdcLine,
    `🏷 Tier: ${tier}`,
    ``,
    `📊 *Stats*`,
    `• Active bets: ${active.length} ($${totalStaked.toFixed(0)} staked)`,
    `• Potential payout: $${potentialWin.toFixed(0)}`,
    `• Won / Lost: ${won.length} / ${lost.length}`,
    `• Est. P&L: ${realizedPnl >= 0 ? '🟢' : '🔴'} $${realizedPnl.toFixed(2)}`,
  ];

  if (user?.wallet_address && user.wallet_verified) {
    const positions = await loadOnChainPositions(user.wallet_address as `0x${string}`);
    if (positions.length) {
      lines.push('', '⛓ *On-chain positions:*');
      for (const p of positions.slice(0, 5)) {
        lines.push(`• ${p.marketQuestion.slice(0, 40)}… — ${p.label} $${p.shares.toFixed(2)}`);
      }
    }
  }

  return lines.filter(Boolean).join('\n');
}

async function loadOnChainPositions(wallet: `0x${string}`) {
  const { getMarketsWithContracts } = await import('../data/markets.js');
  const markets = getMarketsWithContracts().slice(0, 8);
  const out: { marketQuestion: string; label: string; shares: number }[] = [];

  for (const m of markets) {
    const enriched = await getEnrichedMarket(m.id);
    if (!enriched?.contractAddress) continue;
    const pos = await getUserPositions(enriched, wallet);
    for (const p of pos) {
      out.push({ marketQuestion: enriched.question, label: p.label, shares: p.shares });
    }
  }
  return out;
}