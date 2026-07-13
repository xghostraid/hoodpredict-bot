export const SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  telegram_id INTEGER PRIMARY KEY,
  username TEXT,
  wallet_address TEXT,
  wallet_verified INTEGER NOT NULL DEFAULT 0,
  wallet_mode TEXT NOT NULL DEFAULT 'none',
  encrypted_credential TEXT,
  tier TEXT NOT NULL DEFAULT 'free',
  trial_started_at TEXT,
  premium_until TEXT,
  referred_by INTEGER,
  referral_earnings REAL NOT NULL DEFAULT 0,
  referrals_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_settings (
  telegram_id INTEGER PRIMARY KEY,
  default_bet_usd REAL NOT NULL DEFAULT 25,
  quick_bets TEXT NOT NULL DEFAULT '10,25,50,100',
  notify_resolve INTEGER NOT NULL DEFAULT 1,
  notify_whale INTEGER NOT NULL DEFAULT 1,
  cashback_pct REAL NOT NULL DEFAULT 2
);

CREATE TABLE IF NOT EXISTS limit_orders (
  id TEXT PRIMARY KEY,
  telegram_id INTEGER NOT NULL,
  market_id TEXT NOT NULL,
  outcome_index INTEGER NOT NULL,
  amount_usd REAL NOT NULL,
  trigger_probability REAL NOT NULL,
  direction TEXT NOT NULL DEFAULT 'above',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS whale_watches (
  telegram_id INTEGER NOT NULL,
  whale_id TEXT NOT NULL,
  PRIMARY KEY (telegram_id, whale_id)
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