# HoodPredict Bot (@HoodPredictBot)

Polymarket-style prediction market Telegram bot for **Robinhood Chain**. Browse markets, place bets with your wallet, track portfolio, and unlock the **AI Auto-Trader** with Premium.

Built with **grammY** + **viem**, connected to HoodPredict smart contracts on Robinhood Chain testnet.

## Features

### Free Tier
- Browse 24+ prediction markets (Stock Tokens, Sports, Crypto, Politics, Entertainment)
- Live on-chain odds & volume from Robinhood Chain
- Place Yes/No and multi-outcome bets with USDC
- Portfolio & active bets tracking
- Market search & category filters
- Resolution notifications

### Premium ($9.99/mo · $89/yr)
- **AI Auto-Trader** — Grok scans markets, suggests trades, executes with approval
- Custom rules (max bet, min probability, categories, auto mode)
- Performance dashboard (win rate, P&L)
- Advanced AI probability forecasts
- 7-day free trial

## Quick Start

### 1. Create the bot

1. Message [@BotFather](https://t.me/BotFather)
2. `/newbot` → name it **HoodPredict** → username `@HoodPredictBot`
3. Copy the token

### 2. Install & configure

```bash
cd hoodpredict-bot
npm install
cp .env.example .env
```

Edit `.env` with your `TELEGRAM_BOT_TOKEN` and `XAI_API_KEY`.

### 3. Run locally

```bash
npm run dev
```

### 4. Run in production

```bash
npm run build
npm start
```

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome + main menu |
| `/markets` | Browse prediction markets |
| `/mybets` | Active bets |
| `/portfolio` | Portfolio summary & P&L |
| `/create` | Create a new market |
| `/premium` | Upgrade + 7-day trial |
| `/ai` | AI Auto-Trader (Premium) |
| `/wallet 0x…` | Link Robinhood Chain wallet |
| `/verify 0x…` | Verify wallet signature |
| `/confirm m1 0x…` | Confirm on-chain bet tx |
| `/search Lakers` | Search markets |

## Betting Flow

1. **Browse** → `/markets` → pick category → select market
2. **Bet** → choose outcome → pick amount ($10–$250)
3. **Sign** → open HoodPredict web app, connect wallet, approve USDC + bet
4. **Confirm** → `/confirm <marketId> <txHash>`

> Private keys are **never** stored on the server. All signing happens in your wallet.

## Wallet Security

- Only **public addresses** are stored after signature verification
- Users sign a one-time verification message (no gas)
- Bets require explicit wallet approval via HoodPredict web / WalletConnect
- Strong disclaimers on every financial action

## Robinhood Chain

Defaults to **testnet** (chain ID `46630`):

| Contract | Address |
|----------|---------|
| Factory | `0xC477cAa2e42B88D16A95d4b80990CbD527177b1d` |
| USDC | `0xa2d35f0694aEDF76ED7CDa9eD18559BcA9a173DD` |
| Oracle | `0x5E6944bc3e1A7d9445F90b92C5D2aEC0196D6c65` |

24 markets deployed — see `src/data/deployments.json`.

## AI Auto-Trader

Powered by **xAI Grok** (`grok-4.5`). Configure rules via `/ai`:

```
max 50      → max $50 per trade
prob 70     → only markets above 70% probability
auto on     → autonomous mode (within limits)
auto off    → suggest & approve mode
```

## Monetization

| Plan | Price | Features |
|------|-------|----------|
| Free | $0 | Browse, bet, portfolio |
| Premium Monthly | $9.99 | AI trader, forecasts, alerts |
| Premium Yearly | $89 | Same, save 26% |
| Trial | 7 days | Full Premium, no card |

After Stripe payment, admin runs:
```
/grant <telegram_user_id> 30
```

## Account recovery

Users who reset Telegram or switch accounts:

```
/recover
```

3-step wizard: link wallet → sign verify message → see on-chain USDC + positions.

Private keys are **never** stored — seed phrase recovery is via MetaMask/Rabby only.

## Go live (step-by-step)

### 1. Register @HoodPredictBot

1. Open [@BotFather](https://t.me/BotFather)
2. `/newbot` → name: `HoodPredict` → username: `HoodPredictBot`
3. Copy token → paste into `.env` as `TELEGRAM_BOT_TOKEN`
4. Optional: `/setdescription`, `/setabouttext`, `/setuserpic` for branding
5. `/setcommands` — paste:

```
start - Main menu
markets - Browse prediction markets
mybets - My active bets
portfolio - Portfolio summary
create - Create a market
premium - Upgrade to Premium
ai - AI Auto-Trader
wallet - Link wallet
recover - Re-link after Telegram reset
search - Search markets
help - Help
```

### 2. Configure secrets

```bash
cp .env.example .env
```

Minimum required:

```env
TELEGRAM_BOT_TOKEN=<from BotFather>
BOT_USERNAME=HoodPredictBot
XAI_API_KEY=<from console.x.ai>
ADMIN_USER_ID=<your Telegram numeric ID>
```

Get your Telegram ID: message [@userinfobot](https://t.me/userinfobot).

### 3. Test locally

```bash
npm install
npm run dev
```

Open Telegram → search your bot → `/start`. Confirm markets load and `/recover` works.

### 4. Deploy to Railway (recommended)

1. Push `hoodpredict-bot` to GitHub
2. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
3. Select the repo
4. **Variables** tab → add all `.env` values
5. **Settings** → add volume mount: `/app/data` (persists SQLite DB)
6. Deploy — start command is `npm start` (from `railway.toml`)

Bot uses **long polling** — no webhook URL needed. Railway keeps the process running 24/7.

### 5. Verify production

- `/start` responds within 2s
- `/markets` → sports category loads
- `/wallet 0x…` → verification message appears
- `/recover` → wizard shows
- Check Railway logs for `HoodPredict Bot starting…`

### 6. Stripe + Premium

1. Create Stripe Payment Links ($9.99/mo, $89/yr)
2. Set `STRIPE_MONTHLY_LINK` and `STRIPE_YEARLY_LINK`
3. After payment, run `/grant <user_telegram_id> 30` from your admin account

## Deployment

### Railway (recommended)

1. New project → deploy from GitHub
2. Set env vars from `.env.example`
3. Start command: `npm start`
4. Enable persistent volume for `data/` (SQLite)

### VPS

```bash
npm install && npm run build
pm2 start dist/index.js --name hoodpredict-bot
```

### Vercel

Telegram bots need a **long-running process** — use Railway/Fly.io/VPS instead of Vercel serverless. Vercel is fine for the HoodPredict **web app** only.

### Supabase (production DB)

For production, migrate from SQLite to Supabase PostgreSQL:

1. Create project at [supabase.com](https://supabase.com)
2. Run `src/db/schema.ts` SQL in the SQL editor (adapt types for Postgres)
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`

## Project Structure

```
hoodpredict-bot/
├── src/
│   ├── index.ts           # Entry point
│   ├── bot.ts             # grammY setup + jobs
│   ├── config.ts          # Environment
│   ├── handlers/          # Commands & callbacks
│   ├── chain/             # viem + contracts
│   ├── ai/                # Grok auto-trader
│   ├── db/                # SQLite persistence
│   ├── data/              # Markets + ABIs + deployments
│   ├── keyboards/         # Telegram UI
│   └── formatters/        # Message formatting
├── .env.example
└── README.md
```

## Related

- **HoodPredict Web:** `/Users/xace56/hoodpredict` — Next.js frontend + contracts
- **TradePulse Bot:** `/Users/xace56/tradepulse-bot` — AI crypto signals bot

## Disclaimer

⚠️ **Trading involves risk. Not financial advice.** Prediction markets can result in total loss of staked funds. Only bet what you can afford to lose.

## License

MIT