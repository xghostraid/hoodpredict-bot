import factoryAbi from '../data/abis/HoodPredictFactory.json' with { type: 'json' };
import marketAbi from '../data/abis/HoodPredictMarket.json' with { type: 'json' };
import usdcAbi from '../data/abis/MockUSDC.json' with { type: 'json' };
import oracleAbi from '../data/abis/OracleAdapter.json' with { type: 'json' };
import deployments from '../data/deployments.json' with { type: 'json' };
import { config } from '../config.js';

const dep = deployments as {
  contracts: { factory: string; usdc: string; oracleAdapter: string };
};

export const FACTORY_ADDRESS = (config.FACTORY_ADDRESS || dep.contracts.factory) as `0x${string}`;
export const USDC_ADDRESS = (config.USDC_ADDRESS || dep.contracts.usdc) as `0x${string}`;
export const ORACLE_ADAPTER_ADDRESS = (config.ORACLE_ADAPTER_ADDRESS ||
  dep.contracts.oracleAdapter) as `0x${string}`;

export const USDC_DECIMALS = 6;

export const abis = {
  factory: factoryAbi,
  market: marketAbi,
  usdc: usdcAbi,
  oracle: oracleAbi,
} as const;

export type MarketStatusChain = 'open' | 'closed' | 'resolved' | 'cancelled';

export const CHAIN_STATUS_MAP: Record<number, MarketStatusChain> = {
  0: 'open',
  1: 'closed',
  2: 'resolved',
  3: 'cancelled',
};