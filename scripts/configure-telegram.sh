#!/usr/bin/env bash
# Configure @HoodPredictBot metadata via Telegram Bot API
set -euo pipefail

if [[ -z "${TELEGRAM_BOT_TOKEN:-}" ]]; then
  if [[ -f .env ]]; then set -a; source .env; set +a; fi
fi

TOKEN="${TELEGRAM_BOT_TOKEN:?TELEGRAM_BOT_TOKEN required}"
API="https://api.telegram.org/bot${TOKEN}"

echo "→ Setting bot commands..."
curl -s -X POST "${API}/setMyCommands" \
  -H "Content-Type: application/json" \
  -d '{
    "commands": [
      {"command": "start", "description": "Main menu"},
      {"command": "markets", "description": "Browse prediction markets"},
      {"command": "mybets", "description": "My active bets"},
      {"command": "portfolio", "description": "Portfolio summary"},
      {"command": "create", "description": "Create a market"},
      {"command": "premium", "description": "Upgrade to Premium"},
      {"command": "ai", "description": "AI Auto-Trader"},
      {"command": "wallet", "description": "Link wallet"},
      {"command": "recover", "description": "Re-link after Telegram reset"},
      {"command": "search", "description": "Search markets"},
      {"command": "help", "description": "Help"}
    ]
  }' | python3 -c "import sys,json; d=json.load(sys.stdin); print('  OK' if d.get('ok') else d)"

echo "→ Setting description..."
curl -s -X POST "${API}/setMyDescription" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Polymarket-style prediction markets on Robinhood Chain. Bet on stocks, sports, crypto & politics with USDC. Premium AI Auto-Trader included. Not financial advice."
  }' | python3 -c "import sys,json; d=json.load(sys.stdin); print('  OK' if d.get('ok') else d)"

echo "→ Setting short description..."
curl -s -X POST "${API}/setMyShortDescription" \
  -H "Content-Type: application/json" \
  -d '{
    "short_description": "Prediction markets on Robinhood Chain. AI trader. Sports, stocks, crypto."
  }' | python3 -c "import sys,json; d=json.load(sys.stdin); print('  OK' if d.get('ok') else d)"

echo "→ Bot info:"
curl -s "${API}/getMe" | python3 -c "import sys,json; r=json.load(sys.stdin)['result']; print(f\"  @{r['username']} ({r['first_name']})\")"

echo "Done."