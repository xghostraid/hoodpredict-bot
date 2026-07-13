import { createPublicClient, http, defineChain, type PublicClient } from 'viem';
import { config } from '../config.js';

export const robinhoodTestnet = defineChain({
  id: config.CHAIN_ID,
  name: config.USE_TESTNET ? 'Robinhood Chain Testnet' : 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [config.RPC_URL] },
    public: { http: [config.RPC_URL] },
  },
  blockExplorers: config.USE_TESTNET
    ? { default: { name: 'Explorer', url: 'https://explorer.testnet.chain.robinhood.com' } }
    : { default: { name: 'Blockscout', url: 'https://robinhoodchain.blockscout.com' } },
});

export const publicClient: PublicClient = createPublicClient({
  chain: robinhoodTestnet,
  transport: http(config.RPC_URL),
});

export function explorerTxUrl(hash: string): string {
  const base = robinhoodTestnet.blockExplorers?.default.url ?? '';
  return `${base}/tx/${hash}`;
}

export function explorerAddressUrl(address: string): string {
  const base = robinhoodTestnet.blockExplorers?.default.url ?? '';
  return `${base}/address/${address}`;
}