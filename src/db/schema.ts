export const SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  telegram_id INTEGER PRIMARY KEY,
  username TEXT,
  wallet_address TEXT,
  wallet_verified INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'free',
  trial_started_at TEXT,
  premium_until TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bets (
  id TEXT PRIMARY KEY,
  telegram_id INTEGER NOT NULL,
  market_id TEXT NOT NULL,
  market_question TEXT NOT NULL,
  outcome_index INTEGER NOT NULL,
  outcome_label TEXT NOT NULL,
  amount_usd REAL NOT NULL,
  collateral TEXT NOT NULL DEFAULT 'USDC',
  potential_payout REAL,
  status TEXT NOT NULL DEFAULT 'pending',
  tx_hash TEXT,
  contract_address TEXT,
  placed_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS ai_rules (
  telegram_id INTEGER PRIMARY KEY,
  max_bet_usd REAL NOT NULL DEFAULT 50,
  min_probability REAL NOT NULL DEFAULT 70,
  categories TEXT NOT NULL DEFAULT 'stock_tokens,sports,crypto',
  auto_execute INTEGER NOT NULL DEFAULT 0,
  daily_budget_usd REAL NOT NULL DEFAULT 100,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_trades (
  id TEXT PRIMARY KEY,
  telegram_id INTEGER NOT NULL,
  market_id TEXT NOT NULL,
  outcome_index INTEGER NOT NULL,
  amount_usd REAL NOT NULL,
  confidence REAL NOT NULL,
  reasoning TEXT,
  status TEXT NOT NULL DEFAULT 'suggested',
  pnl_usd REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS alert_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER NOT NULL,
  market_id TEXT NOT NULL,
  notify_resolve INTEGER NOT NULL DEFAULT 1,
  notify_new_market INTEGER NOT NULL DEFAULT 0,
  UNIQUE(telegram_id, market_id)
);

CREATE TABLE IF NOT EXISTS wallet_nonces (
  telegram_id INTEGER PRIMARY KEY,
  nonce TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bets_user ON bets(telegram_id);
CREATE INDEX IF NOT EXISTS idx_bets_market ON bets(market_id);
`;