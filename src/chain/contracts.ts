import factoryAbi from '../data/abis/HoodPredictFactory.json' with { type: 'json' };
import marketAbi from '../data/abis/HoodPredictMarket.json' with { type: 'json' };
import usdcAbi from '../data/abis/MockUSDC.json' with { type: 'json' };
import oracleAbi from '../data/abis/OracleAdapter.json' with { type: 'json' };
import testnetDeployments from '../data/deployments-testnet.json' with { type: 'json' };
import mainnetDeployments from '../data/deployments-mainnet.json' with { type: 'json' };
import { config } from '../config.js';

const MAINNET_USDG = '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168';

const dep = (config.USE_TESTNET ? testnetDeployments : mainnetDeployments) as {
  contracts: { factory: string; usdc: string; oracleAdapter: string };
};

export const FACTORY_ADDRESS = (config.FACTORY_ADDRESS || dep.contracts.factory) as `0x${string}`;
export const USDC_ADDRESS = (config.USDC_ADDRESS ||
  dep.contracts.usdc ||
  (config.USE_TESTNET ? '' : MAINNET_USDG)) as `0x${string}`;
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