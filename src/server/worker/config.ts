import 'dotenv/config';
import dns from 'node:dns';
import { ethers } from 'ethers';
import { getMnemonic } from '../hdWallet';

// Force IPv4 first on Render containers (prevents ENETUNREACH 2606:4700:: IPv6 socket hangs)
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // ignore if unsupported
}

// Constant BNB gas amount sent for sweeping BEP-20 USDT to Hot Wallet
export const GAS_AMOUNT_BNB = '0.0001';

// Public BSC JSON-RPC endpoints verified to support eth_getLogs with automatic fallback
// Note: Official bsc-dataseed* nodes disable eth_getLogs and are excluded from log scanning
export function getConfiguredPrimaryRpc(): string {
  return (
    process.env.RPC_URL ||
    process.env.BSC_RPC_URL ||
    process.env.ALCHEMY_RPC_URL ||
    ''
  ).trim();
}

export function maskRpcUrl(url: string): string {
  if (!url) return '(none)';
  // Mask Alchemy/QuickNode/Infura API keys at the end of path for safe logging
  return url.replace(/(\/v2\/|\/v3\/)([a-zA-Z0-9_-]{4})[a-zA-Z0-9_-]+([a-zA-Z0-9_-]{3})$/, '$1$2...$3');
}

const customRpc = getConfiguredPrimaryRpc();
const isCustomRpcLogCapable =
  customRpc.length > 0 &&
  !customRpc.includes('bsc-dataseed') &&
  !customRpc.includes('defibit.io') &&
  !customRpc.includes('ninicoin.io') &&
  !customRpc.includes('1rpc.io');

export const BSC_RPC_ENDPOINTS = Array.from(
  new Set([
    ...(isCustomRpcLogCapable ? [customRpc] : []),
    'https://bsc-rpc.publicnode.com',
    'https://bsc.drpc.org',
    'https://rpc-bsc.48.club',
  ])
);

const BSC_NETWORK = ethers.Network.from({ name: 'bnb', chainId: 56 });

/**
 * Creates a non-batching BSC JsonRpcProvider (`batchMaxCount: 1`) with an 8-second request timeout.
 * Disabling JSON-RPC batching prevents public BSC nodes from throwing
 * `-32005: method eth_getLogs in batch triggered rate limit`, and the 8s timeout
 * prevents hung sockets from stalling the worker.
 */
export function createBscProvider(rpcUrl?: string): ethers.JsonRpcProvider {
  const url = rpcUrl || CONFIG.rpc;
  const fetchReq = new ethers.FetchRequest(url);
  fetchReq.timeout = 8000;
  return new ethers.JsonRpcProvider(fetchReq, BSC_NETWORK, {
    staticNetwork: BSC_NETWORK,
    batchMaxCount: 1,
  });
}

export const CONFIG = {
  get rpc(): string {
    return getConfiguredPrimaryRpc() || 'https://bsc-rpc.publicnode.com';
  },
  usdt: (process.env.USDT_CONTRACT || '0x55d398326f99059fF775485246999027B3197955').toLowerCase(),
  get mnemonic(): string {
    return getMnemonic();
  },
  get hotAddress(): string {
    return (process.env.HOT_WALLET_ADDRESS || '').trim();
  },
  get hotKey(): string {
    return (process.env.HOT_WALLET_PRIVATE_KEY || '').trim();
  },
  gasAmount: GAS_AMOUNT_BNB, // Constant 0.0001 BNB in code
  get databaseUrl(): string {
    return process.env.DATABASE_URL || '';
  },
};
