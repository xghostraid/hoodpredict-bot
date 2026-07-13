# HoodPredict Launch Status

*Auto-generated — last updated when launch tasks were run.*

## Done automatically

| Task | Status |
|------|--------|
| Bot running 24/7 (PM2) | ✅ `pm2 list` → hoodpredict-bot online |
| Telegram commands configured | ✅ via `scripts/configure-telegram.sh` |
| Bot description & short bio | ✅ set via Bot API |
| GitHub repo | ✅ https://github.com/xghostraid/hoodpredict-bot |
| Robinhood Chain testnet wired | ✅ 24 markets, factory + USDC |
| `/recover` re-link wizard | ✅ shipped |
| WalletConnect project ID | ✅ in `.env` |
| HoodPredict web built | ✅ `npm run build` succeeded |

## Bot identity

- **Username:** [@HoodPredictbot](https://t.me/HoodPredictbot)
- **Test:** send `/start` in Telegram

## Needs your action (cannot automate)

| Task | Why | How |
|------|-----|-----|
| **Revoke bot token** | Token was posted in chat | BotFather → Revoke → update `.env` |
| **ADMIN_USER_ID** | No one has messaged the bot yet | Message bot → run `getUpdates` or use @userinfobot |
| **XAI_API_KEY** | Not in your env files | [console.x.ai](https://console.x.ai) → add to `.env` |
| **Stripe links** | Needs your Stripe account | Create payment links → `.env` |
| **Vercel deploy** | `vercel login` required | Run `npx vercel login` then deploy hoodpredict web |
| **Railway deploy** | Optional cloud host | Import GitHub repo at railway.app |

## Local services (PM2)

```bash
pm2 list                    # hoodpredict-bot + hoodpredict-web
pm2 logs hoodpredict-bot    # bot logs
pm2 restart hoodpredict-bot # after .env changes
```

## Web app URL

Until Vercel is deployed, bet links point to:
`http://localhost:3001` (hoodpredict-web via PM2)

After Vercel: update `WEB_APP_URL` in `.env` and `pm2 restart hoodpredict-bot`.

## Security reminder

⚠️ Rotate `TELEGRAM_BOT_TOKEN` in BotFather before public launch.