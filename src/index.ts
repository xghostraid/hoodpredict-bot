import { createBot, startBot } from './bot.js';
import { getDb } from './db/index.js';

// Initialize DB on startup
getDb();

const bot = createBot();
startBot(bot);