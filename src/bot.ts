import { Bot } from 'grammy';
import { run } from '@grammyjs/runner';
import { config } from './config.js';
import { registerHandlers } from './handlers/index.js';
import { checkMarketResolutions } from './services/notifications.js';

export function createBot() {
  const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

  registerHandlers(bot);

  bot.catch((err) => {
    console.error('Bot error:', err.error);
  });

  return bot;
}

export function startBot(bot: ReturnType<typeof createBot>) {
  // Resolution notifications every 2 minutes
  setInterval(() => {
    checkMarketResolutions(bot).catch(console.error);
  }, 120_000);

  console.log(`🏹 HoodPredict Bot (@${config.BOT_USERNAME}) starting…`);
  console.log(`⛓  Chain: Robinhood ${config.USE_TESTNET ? 'Testnet' : 'Mainnet'} (${config.CHAIN_ID})`);

  return run(bot);
}