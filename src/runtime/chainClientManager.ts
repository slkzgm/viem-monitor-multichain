import { createPublicClient, http, webSocket } from "viem";
import type { ChainConfig } from "../shared/types.js";
import { createScopedLogger } from "../shared/logger.js";

export type ManagedPublicClient = ReturnType<typeof createPublicClient>;

interface ManagedClient {
  config: ChainConfig;
  client: ManagedPublicClient;
}

export class ChainClientManager {
  private readonly clients = new Map<string, ManagedClient>();
  private readonly log = createScopedLogger({ scope: "ChainClientManager" });

  constructor(private readonly chainConfigs: ChainConfig[]) {}

  initialize() {
    for (const chainConfig of this.chainConfigs) {
      if (chainConfig.enabled === false) {
        this.log.debug({ chain: chainConfig.key }, "Skipping disabled chain");
        continue;
      }

      if (!chainConfig.rpcUrl) {
        this.log.warn({ chain: chainConfig.key }, "Missing RPC URL, skipping chain");
        continue;
      }

      const client = this.createClient(chainConfig);
      this.clients.set(chainConfig.key, { config: chainConfig, client });
      this.log.info({ chain: chainConfig.key }, "Initialized chain client");
    }
  }

  getClient(chainKey: string) {
    return this.clients.get(chainKey)?.client;
  }

  getConfig(chainKey: string) {
    return this.clients.get(chainKey)?.config;
  }

  listActiveChains() {
    return Array.from(this.clients.values()).map((managed) => managed.config);
  }

  private createClient(chainConfig: ChainConfig): ManagedPublicClient {
    const transport =
      chainConfig.transport === "http"
        ? http(chainConfig.rpcUrl)
        : webSocket(chainConfig.rpcUrl);

    return createPublicClient({
      chain: chainConfig.chain,
      transport,
      batch: { multicall: true },
      pollingInterval: chainConfig.pollingIntervalMs ?? 4000,
    }) as ManagedPublicClient;
  }
}
