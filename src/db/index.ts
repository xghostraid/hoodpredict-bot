import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { randomUUID } from 'crypto';
import { config } from '../config.js';
import { SQLITE_SCHEMA } from './schema.js';
import type { AiTraderRules, BetStatus, PremiumTier, UserBet } from '../types.js';

export type WalletMode = 'none' | 'external' | 'custodial';

export interface DbUser {
  telegram_id: number;
  username: string | null;
  wallet_address: string | null;
  wallet_verified: boolean;
  wallet_mode: WalletMode;
  encrypted_credential: string | null;
  tier: PremiumTier;
  trial_started_at: string | null;
  premium_until: string | null;
  referred_by: number | null;
  referral_earnings: number;
  referrals_count: number;
}

export interface UserSettings {
  defaultBetUsd: number;
  quickBets: number[];
  notifyResolve: boolean;
  notifyWhale: boolean;
  cashbackPct: number;
}

export interface LimitOrder {
  id: string;
  telegramId: number;
  marketId: string;
  outcomeIndex: number;
  amountUsd: number;
  triggerProbability: number;
  direction: 'above' | 'below';
  status: 'active' | 'filled' | 'cancelled';
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    mkdirSync(dirname(config.DB_PATH), { recursive: true });
    db = new Database(config.DB_PATH);
    db.pragma('journal_mode = WAL');
    db.exec(SQLITE_SCHEMA);
    runMigrations(db);
  }
  return db;
}

function runMigrations(d: Database.Database): void {
  for (const sql of [
    `ALTER TABLE users ADD COLUMN wallet_mode TEXT NOT NULL DEFAULT 'none'`,
    `ALTER TABLE users ADD COLUMN encrypted_credential TEXT`,
    `ALTER TABLE users ADD COLUMN referred_by INTEGER`,
    `ALTER TABLE users ADD COLUMN referral_earnings REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN referrals_count INTEGER NOT NULL DEFAULT 0`,
  ]) {
    try {
      d.exec(sql);
    } catch {
      /* exists */
    }
  }
}

export function ensureUser(
  telegramId: number,
  username?: string,
  referredBy?: number | null,
): DbUser {
  const d = getDb();
  const isNew = !d.prepare('SELECT 1 FROM users WHERE telegram_id = ?').get(telegramId);

  d.prepare(
    `INSERT INTO users (telegram_id, username, referred_by) VALUES (?, ?, ?)
     ON CONFLICT(telegram_id) DO UPDATE SET username = COALESCE(excluded.username, username)`,
  ).run(telegramId, username ?? null, referredBy ?? null);

  if (isNew && referredBy && referredBy !== telegramId) {
    d.prepare(`UPDATE users SET referrals_count = referrals_count + 1 WHERE telegram_id = ?`).run(
      referredBy,
    );
  }

  d.prepare(
    `INSERT OR IGNORE INTO user_settings (telegram_id) VALUES (?)`,
  ).run(telegramId);

  return getUser(telegramId)!;
}

export function getUser(telegramId: number): DbUser | null {
  const row = getDb()
    .prepare('SELECT * FROM users WHERE telegram_id = ?')
    .get(telegramId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    telegram_id: row.telegram_id as number,
    username: row.username as string | null,
    wallet_address: row.wallet_address as string | null,
    wallet_verified: Boolean(row.wallet_verified),
    wallet_mode: (row.wallet_mode as WalletMode) || 'none',
    encrypted_credential: (row.encrypted_credential as string | null) ?? null,
    tier: resolveTier(row),
    trial_started_at: row.trial_started_at as string | null,
    premium_until: row.premium_until as string | null,
    referred_by: (row.referred_by as number | null) ?? null,
    referral_earnings: (row.referral_earnings as number) ?? 0,
    referrals_count: (row.referrals_count as number) ?? 0,
  };
}

export function getSettings(telegramId: number): UserSettings {
  const row = getDb()
    .prepare('SELECT * FROM user_settings WHERE telegram_id = ?')
    .get(telegramId) as Record<string, unknown> | undefined;

  if (!row) {
    return {
      defaultBetUsd: 25,
      quickBets: [10, 25, 50, 100],
      notifyResolve: true,
      notifyWhale: true,
      cashbackPct: 2,
    };
  }

  return {
    defaultBetUsd: row.default_bet_usd as number,
    quickBets: (row.quick_bets as string).split(',').map(Number),
    notifyResolve: Boolean(row.notify_resolve),
    notifyWhale: Boolean(row.notify_whale),
    cashbackPct: row.cashback_pct as number,
  };
}

export function saveSettings(telegramId: number, partial: Partial<UserSettings>): void {
  const cur = getSettings(telegramId);
  const next = { ...cur, ...partial };
  getDb()
    .prepare(
      `INSERT INTO user_settings (telegram_id, default_bet_usd, quick_bets, notify_resolve, notify_whale, cashback_pct)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(telegram_id) DO UPDATE SET
         default_bet_usd = excluded.default_bet_usd,
         quick_bets = excluded.quick_bets,
         notify_resolve = excluded.notify_resolve,
         notify_whale = excluded.notify_whale,
         cashback_pct = excluded.cashback_pct`,
    )
    .run(
      telegramId,
      next.defaultBetUsd,
      next.quickBets.join(','),
      next.notifyResolve ? 1 : 0,
      next.notifyWhale ? 1 : 0,
      next.cashbackPct,
    );
}

export function addLimitOrder(order: Omit<LimitOrder, 'id' | 'status'>): string {
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO limit_orders (id, telegram_id, market_id, outcome_index, amount_usd, trigger_probability, direction)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      order.telegramId,
      order.marketId,
      order.outcomeIndex,
      order.amountUsd,
      order.triggerProbability,
      order.direction,
    );
  return id;
}

export function getActiveLimitOrders(telegramId?: number): LimitOrder[] {
  const sql = telegramId
    ? `SELECT * FROM limit_orders WHERE telegram_id = ? AND status = 'active'`
    : `SELECT * FROM limit_orders WHERE status = 'active'`;
  const rows = (
    telegramId
      ? getDb().prepare(sql).all(telegramId)
      : getDb().prepare(sql).all()
  ) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: r.id as string,
    telegramId: r.telegram_id as number,
    marketId: r.market_id as string,
    outcomeIndex: r.outcome_index as number,
    amountUsd: r.amount_usd as number,
    triggerProbability: r.trigger_probability as number,
    direction: r.direction as 'above' | 'below',
    status: r.status as LimitOrder['status'],
  }));
}

export function fillLimitOrder(id: string): void {
  getDb().prepare(`UPDATE limit_orders SET status = 'filled' WHERE id = ?`).run(id);
}

export function watchWhale(telegramId: number, whaleId: string): boolean {
  const r = getDb()
    .prepare(`INSERT OR IGNORE INTO whale_watches (telegram_id, whale_id) VALUES (?, ?)`)
    .run(telegramId, whaleId);
  return r.changes > 0;
}

export function getWatchedWhales(telegramId: number): string[] {
  const rows = getDb()
    .prepare(`SELECT whale_id FROM whale_watches WHERE telegram_id = ?`)
    .all(telegramId) as { whale_id: string }[];
  return rows.map((r) => r.whale_id);
}

export function getLeaderboard(limit = 10): {
  telegramId: number;
  username: string | null;
  volume: number;
  bets: number;
  wins: number;
}[] {
  const rows = getDb()
    .prepare(
      `SELECT b.telegram_id, u.username,
              SUM(b.amount_usd) as volume,
              COUNT(*) as bets,
              SUM(CASE WHEN b.status = 'won' THEN 1 ELSE 0 END) as wins
       FROM bets b
       LEFT JOIN users u ON u.telegram_id = b.telegram_id
       WHERE b.status IN ('active','won','lost')
       GROUP BY b.telegram_id
       ORDER BY volume DESC
       LIMIT ?`,
    )
    .all(limit) as Record<string, unknown>[];
  return rows.map((r) => ({
    telegramId: r.telegram_id as number,
    username: r.username as string | null,
    volume: (r.volume as number) ?? 0,
    bets: (r.bets as number) ?? 0,
    wins: (r.wins as number) ?? 0,
  }));
}

export function addReferralEarnings(referrerId: number, amount: number): void {
  getDb()
    .prepare(`UPDATE users SET referral_earnings = referral_earnings + ? WHERE telegram_id = ?`)
    .run(amount, referrerId);
}

function resolveTier(row: Record<string, unknown>): PremiumTier {
  const tier = row.tier as string;
  const until = row.premium_until as string | null;
  const trial = row.trial_started_at as string | null;

  if (tier === 'premium' && until) {
    const active = getDb()
      .prepare(`SELECT 1 WHERE datetime(?) > datetime('now')`)
      .get(until);
    if (active) return 'premium';
  }

  if (trial) {
    const trialActive = getDb()
      .prepare(`SELECT 1 WHERE datetime(?, '+${config.TRIAL_DAYS} days') > datetime('now')`)
      .get(trial);
    if (trialActive) return 'premium';
  }

  if (tier === 'premium') {
    getDb()
      .prepare(`UPDATE users SET tier = 'free', premium_until = NULL WHERE telegram_id = ?`)
      .run(row.telegram_id);
  }
  return 'free';
}

export function isPremium(telegramId: number): boolean {
  return getUser(telegramId)?.tier === 'premium';
}

export function startTrial(telegramId: number): boolean {
  const user = getUser(telegramId);
  if (!user || user.trial_started_at) return false;
  getDb()
    .prepare(`UPDATE users SET trial_started_at = datetime('now'), tier = 'premium' WHERE telegram_id = ?`)
    .run(telegramId);
  return true;
}

export function grantPremium(telegramId: number, days: number): void {
  getDb()
    .prepare(
      `UPDATE users SET tier = 'premium',
       premium_until = datetime('now', '+' || ? || ' days') WHERE telegram_id = ?`,
    )
    .run(days, telegramId);
}

export function setWallet(telegramId: number, address: string, verified: boolean): void {
  getDb()
    .prepare(
      `UPDATE users SET wallet_address = ?, wallet_verified = ?, wallet_mode = 'external',
       encrypted_credential = NULL WHERE telegram_id = ?`,
    )
    .run(address, verified ? 1 : 0, telegramId);
}

export function setCustodialWallet(
  telegramId: number,
  address: string,
  encryptedCredential: string,
): void {
  getDb()
    .prepare(
      `UPDATE users SET wallet_address = ?, wallet_verified = 1, wallet_mode = 'custodial',
       encrypted_credential = ? WHERE telegram_id = ?`,
    )
    .run(address, encryptedCredential, telegramId);
}

export function clearWallet(telegramId: number): void {
  getDb()
    .prepare(
      `UPDATE users SET wallet_address = NULL, wallet_verified = 0, wallet_mode = 'none',
       encrypted_credential = NULL WHERE telegram_id = ?`,
    )
    .run(telegramId);
}

export function getCustodialCredential(telegramId: number): string | null {
  const row = getDb()
    .prepare(
      `SELECT encrypted_credential FROM users WHERE telegram_id = ? AND wallet_mode = 'custodial'`,
    )
    .get(telegramId) as { encrypted_credential: string | null } | undefined;
  return row?.encrypted_credential ?? null;
}

export function hasCustodialWallet(telegramId: number): boolean {
  return getUser(telegramId)?.wallet_mode === 'custodial';
}

export function setWalletNonce(telegramId: number, nonce: string): void {
  getDb()
    .prepare(
      `INSERT INTO wallet_nonces (telegram_id, nonce) VALUES (?, ?)
       ON CONFLICT(telegram_id) DO UPDATE SET nonce = excluded.nonce, created_at = datetime('now')`,
    )
    .run(telegramId, nonce);
}

export function getWalletNonce(telegramId: number): string | null {
  const row = getDb()
    .prepare('SELECT nonce FROM wallet_nonces WHERE telegram_id = ?')
    .get(telegramId) as { nonce: string } | undefined;
  return row?.nonce ?? null;
}

export function saveBet(bet: Omit<UserBet, 'id'> & { telegramId: number; contractAddress?: string }): string {
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO bets (id, telegram_id, market_id, market_question, outcome_index, outcome_label,
       amount_usd, collateral, potential_payout, status, tx_hash, contract_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      bet.telegramId,
      bet.marketId,
      bet.marketQuestion,
      bet.outcomeIndex,
      bet.outcomeLabel,
      bet.amount,
      bet.collateral,
      bet.potentialPayout,
      bet.status,
      bet.txHash ?? null,
      bet.contractAddress ?? null,
    );
  return id;
}

export function confirmBet(
  telegramId: number,
  marketId: string,
  txHash: string,
): UserBet | null {
  const row = getDb()
    .prepare(
      `SELECT * FROM bets WHERE telegram_id = ? AND market_id = ? AND status = 'pending'
       ORDER BY placed_at DESC LIMIT 1`,
    )
    .get(telegramId, marketId) as Record<string, unknown> | undefined;

  if (!row) return null;

  getDb()
    .prepare(`UPDATE bets SET status = 'active', tx_hash = ? WHERE id = ?`)
    .run(txHash, row.id);

  return rowToBet({ ...row, status: 'active', tx_hash: txHash });
}

export function getUserBets(telegramId: number, status?: BetStatus): UserBet[] {
  const sql = status
    ? `SELECT * FROM bets WHERE telegram_id = ? AND status = ? ORDER BY placed_at DESC`
    : `SELECT * FROM bets WHERE telegram_id = ? ORDER BY placed_at DESC LIMIT 20`;
  const rows = status
    ? (getDb().prepare(sql).all(telegramId, status) as Record<string, unknown>[])
    : (getDb().prepare(sql).all(telegramId) as Record<string, unknown>[]);
  return rows.map(rowToBet);
}

function rowToBet(row: Record<string, unknown>): UserBet {
  return {
    id: row.id as string,
    marketId: row.market_id as string,
    marketQuestion: row.market_question as string,
    outcomeLabel: row.outcome_label as string,
    outcomeIndex: row.outcome_index as number,
    amount: row.amount_usd as number,
    collateral: row.collateral as string,
    potentialPayout: (row.potential_payout as number) ?? 0,
    status: row.status as BetStatus,
    placedAt: row.placed_at as string,
    resolvedAt: row.resolved_at as string | undefined,
    txHash: row.tx_hash as string | undefined,
  };
}

export function getAiRules(telegramId: number): AiTraderRules {
  const row = getDb()
    .prepare('SELECT * FROM ai_rules WHERE telegram_id = ?')
    .get(telegramId) as Record<string, unknown> | undefined;

  if (!row) {
    return {
      maxBetUsd: 50,
      minProbability: 70,
      categories: ['stock_tokens', 'sports', 'crypto'],
      autoExecute: false,
      dailyBudgetUsd: 100,
    };
  }

  return {
    maxBetUsd: row.max_bet_usd as number,
    minProbability: row.min_probability as number,
    categories: (row.categories as string).split(',') as AiTraderRules['categories'],
    autoExecute: Boolean(row.auto_execute),
    dailyBudgetUsd: row.daily_budget_usd as number,
  };
}

export function saveAiRules(telegramId: number, rules: AiTraderRules): void {
  getDb()
    .prepare(
      `INSERT INTO ai_rules (telegram_id, max_bet_usd, min_probability, categories, auto_execute, daily_budget_usd)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(telegram_id) DO UPDATE SET
         max_bet_usd = excluded.max_bet_usd,
         min_probability = excluded.min_probability,
         categories = excluded.categories,
         auto_execute = excluded.auto_execute,
         daily_budget_usd = excluded.daily_budget_usd,
         updated_at = datetime('now')`,
    )
    .run(
      telegramId,
      rules.maxBetUsd,
      rules.minProbability,
      rules.categories.join(','),
      rules.autoExecute ? 1 : 0,
      rules.dailyBudgetUsd,
    );
}

export function saveAiTrade(
  telegramId: number,
  marketId: string,
  outcomeIndex: number,
  amountUsd: number,
  confidence: number,
  reasoning: string,
  status: 'suggested' | 'executed' | 'rejected' = 'suggested',
): string {
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO ai_trades (id, telegram_id, market_id, outcome_index, amount_usd, confidence, reasoning, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, telegramId, marketId, outcomeIndex, amountUsd, confidence, reasoning, status);
  return id;
}

export function getAiStats(telegramId: number): {
  total: number;
  executed: number;
  winRate: number;
  pnl: number;
} {
  const rows = getDb()
    .prepare(`SELECT status, pnl_usd FROM ai_trades WHERE telegram_id = ?`)
    .all(telegramId) as { status: string; pnl_usd: number | null }[];

  const executed = rows.filter((r) => r.status === 'executed');
  const wins = executed.filter((r) => (r.pnl_usd ?? 0) > 0);
  return {
    total: rows.length,
    executed: executed.length,
    winRate: executed.length ? Math.round((wins.length / executed.length) * 100) : 0,
    pnl: executed.reduce((s, r) => s + (r.pnl_usd ?? 0), 0),
  };
}

export function subscribeMarket(telegramId: number, marketId: string): void {
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO alert_subscriptions (telegram_id, market_id) VALUES (?, ?)`,
    )
    .run(telegramId, marketId);
}

export function getResolveSubscribers(marketId: string): number[] {
  const rows = getDb()
    .prepare(
      `SELECT telegram_id FROM alert_subscriptions WHERE market_id = ? AND notify_resolve = 1`,
    )
    .all(marketId) as { telegram_id: number }[];
  return rows.map((r) => r.telegram_id);
}

export function getStats(): { users: number; premium: number; bets: number } {
  const d = getDb();
  const users = (d.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  const premium = (
    d.prepare(`SELECT COUNT(*) as c FROM users WHERE tier = 'premium'`).get() as { c: number }
  ).c;
  const bets = (d.prepare('SELECT COUNT(*) as c FROM bets').get() as { c: number }).c;
  return { users, premium, bets };
}