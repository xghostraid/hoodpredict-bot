import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  BOT_USERNAME: z.string().default('HoodPredictBot'),
  XAI_API_KEY: z.string().optional(),
  XAI_MODEL: z.string().default('grok-4.5'),
  RPC_URL: z.string().default('https://rpc.testnet.chain.robinhood.com'),
  CHAIN_ID: z.coerce.number().default(46630),
  USE_TESTNET: z.coerce.boolean().default(true),
  FACTORY_ADDRESS: z.string().optional(),
  USDC_ADDRESS: z.string().optional(),
  ORACLE_ADAPTER_ADDRESS: z.string().optional(),
  WALLETCONNECT_PROJECT_ID: z.string().optional(),
  WEB_APP_URL: z.string().default('https://hoodpredict.vercel.app'),
  STRIPE_MONTHLY_LINK: z.string().default('https://buy.stripe.com/hoodpredict_monthly'),
  STRIPE_YEARLY_LINK: z.string().default('https://buy.stripe.com/hoodpredict_yearly'),
  PREMIUM_MONTHLY_USD: z.coerce.number().default(9.99),
  PREMIUM_YEARLY_USD: z.coerce.number().default(89),
  TRIAL_DAYS: z.coerce.number().default(7),
  ADMIN_USER_ID: z.coerce.number().optional(),
  DB_PATH: z.string().default('data/hoodpredict.db'),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_KEY: z.string().optional(),
  WALLET_ENCRYPTION_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment:', parsed.error.flatten().fieldErrors);
  throw new Error('TELEGRAM_BOT_TOKEN is required. Copy .env.example to .env');
}

export const config = parsed.data;

export const DISCLAIMER =
  '⚠️ *Trading involves risk. Not financial advice.* Predictions can lose 100%. Only bet what you can afford to lose.';

export const PREMIUM_FEATURES = [
  '🤖 AI Auto-Trader with custom rules',
  '📊 Performance dashboard (win rate, P&L)',
  '🔔 Priority market alerts & early access',
  '📈 Advanced probability forecasts',
  '🎯 Custom AI strategies',
] as const;