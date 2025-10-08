import { abstract, mainnet } from "viem/chains";
import { ChainConfig } from "../shared/types.js";

type EnvAccessor = (key: string, fallback?: string) => string;

const env: EnvAccessor = (key, fallback) => {
  const value = process.env[key];
  if (value && value.trim().length > 0) {
    return value;
  }
  if (fallback) {
    return fallback;
  }
  throw new Error(`Missing environment variable: ${key}`);
};

const ethereumRpc = process.env.CHAIN_RPC_ETHEREUM_MAINNET;

export const chains: ChainConfig[] = [
  {
    key: "abstract-mainnet",
    name: "Abstract Mainnet",
    chain: abstract,
    transport: "websocket",
    rpcUrl: env("CHAIN_RPC_ABSTRACT_MAINNET", "wss://api.mainnet.abs.xyz/ws"),
    pollingIntervalMs: 4000,
    enabled: true,
    tags: ["production"],
  },
  {
    key: "ethereum-mainnet",
    name: "Ethereum Mainnet",
    chain: mainnet,
    transport: "websocket",
    rpcUrl: ethereumRpc ?? "",
    pollingIntervalMs: 4000,
    enabled: Boolean(ethereumRpc),
    tags: ["production"],
  },
];

export function resolveChainConfig(key: string): ChainConfig | undefined {
  return chains.find((chain) => chain.key === key && chain.enabled !== false);
}
