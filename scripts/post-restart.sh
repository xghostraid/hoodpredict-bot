#!/usr/bin/env bash
# Run after changing .env
set -euo pipefail
cd "$(dirname "$0")/.."
./scripts/configure-telegram.sh
pm2 restart hoodpredict-bot
pm2 logs hoodpredict-bot --lines 10 --nostream
echo "Bot restarted. Test: https://t.me/HoodPredictbot"