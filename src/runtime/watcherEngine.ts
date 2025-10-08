import { createScopedLogger } from "../shared/logger.js";
import type {
  ChainConfig,
  ContractEventNotification,
  ContractEventSource,
  HandlerContext,
  HandlerResult,
  NormalizedEvent,
  WatcherDefinition,
  WalletActivityNotification,
  WalletActivitySource,
  WatcherHandler,
} from "../shared/types.js";
import { ChainClientManager, ManagedPublicClient } from "./chainClientManager.js";
import { getHandlerFactory } from "../handlers/index.js";
import { PipelineManager } from "./pipelineManager.js";

interface ActiveWatcher {
  watcher: WatcherDefinition;
  chain: ChainConfig;
  stop: () => void;
  shutdownHandler?: () => Promise<void>;
}

export class WatcherEngine {
  private readonly log = createScopedLogger({ scope: "WatcherEngine" });
  private readonly activeWatchers: ActiveWatcher[] = [];

  constructor(
    private readonly chainClientManager: ChainClientManager,
    private readonly pipelineManager: PipelineManager,
  ) {}

  start(watchers: WatcherDefinition[]) {
    for (const watcher of watchers) {
      if (watcher.enabled === false) {
        this.log.debug({ watcherId: watcher.id }, "Skipping disabled watcher");
        continue;
      }

      for (const chainKey of watcher.chains) {
        const client = this.chainClientManager.getClient(chainKey);
        const chainConfig = this.chainClientManager.getConfig(chainKey);

        if (!client || !chainConfig) {
          this.log.warn(
            { watcherId: watcher.id, chainKey },
            "Client not available for chain",
          );
          continue;
        }

        this.startWatcherOnChain(watcher, chainConfig, client);
      }
    }
  }

  async shutdown() {
    for (const active of this.activeWatchers) {
      try {
        active.stop();
      } catch (error) {
        this.log.error(
          { watcherId: active.watcher.id, chainKey: active.chain.key, error },
          "Failed to stop watcher",
        );
      }

      if (active.shutdownHandler) {
        try {
          await active.shutdownHandler();
        } catch (error) {
          this.log.error(
            { watcherId: active.watcher.id, chainKey: active.chain.key, error },
            "Handler shutdown failed",
          );
        }
      }
    }

    this.activeWatchers.splice(0, this.activeWatchers.length);
  }

  private startWatcherOnChain(
    watcher: WatcherDefinition,
    chain: ChainConfig,
    client: ManagedPublicClient,
  ) {
    const handlerFactory = getHandlerFactory(watcher.handler);
    const handlerLogger = createScopedLogger({
      scope: "WatcherHandler",
      watcherId: watcher.id,
      chainKey: chain.key,
    });

    const handler = handlerFactory({ watcher, chain, logger: handlerLogger });

    const context: HandlerContext = {
      watcher,
      chain,
      logger: handlerLogger,
    };

    let stop: () => void = () => {};

    if (watcher.source.type === "contractEvent") {
      stop = this.startContractEventWatcher(
        watcher,
        watcher.source,
        chain,
        client,
        handler,
        context,
      );
    } else if (watcher.source.type === "walletActivity") {
      stop = this.startWalletActivityWatcher(
        watcher,
        watcher.source,
        chain,
        client,
        handler,
        context,
      );
    } else {
      this.log.warn(
        {
          watcherId: watcher.id,
          chainKey: chain.key,
          sourceType: (watcher as any).source?.type ?? "unknown",
        },
        "Unsupported watcher source",
      );
      return;
    }

    this.activeWatchers.push({
      watcher,
      chain,
      stop,
      shutdownHandler: handler.shutdown ? () => handler.shutdown!() : undefined,
    });
    this.log.info({ watcherId: watcher.id, chainKey: chain.key }, "Watcher started");
  }

  private startContractEventWatcher(
    watcher: WatcherDefinition,
    source: ContractEventSource,
    chain: ChainConfig,
    client: ManagedPublicClient,
    handler: WatcherHandler,
    context: HandlerContext,
  ) {
    const stop = client.watchContractEvent({
      address: source.address,
      abi: source.abi,
      eventName: source.eventName,
      args: source.args,
      fromBlock:
        source.fromBlock && source.fromBlock !== "latest" ? source.fromBlock : undefined,
      onLogs: async (logs) => {
        for (const log of logs) {
          const event: ContractEventNotification = {
            type: "contractEvent",
            watcherId: watcher.id,
            chainKey: chain.key,
            chainId: chain.chain.id,
            blockNumber: log.blockNumber ?? undefined,
            transactionHash: log.transactionHash ?? undefined,
            log,
          };

          await this.dispatch(handler, context, watcher, chain, event);
        }
      },
      onError: (error) => {
        this.log.error(
          { watcherId: watcher.id, chainKey: chain.key, error },
          "Contract watcher error",
        );
      },
    });

    return stop;
  }

  private startWalletActivityWatcher(
    watcher: WatcherDefinition,
    source: WalletActivitySource,
    chain: ChainConfig,
    client: ManagedPublicClient,
    handler: WatcherHandler,
    context: HandlerContext,
  ) {
    const addressSet = new Set(source.addresses.map((addr: string) => addr.toLowerCase()));

    const stop = client.watchBlocks({
      includeTransactions: true,
      onBlock: async (block) => {
        if (!block || !block.transactions) {
          return;
        }

        for (const tx of block.transactions) {
          if (typeof tx === "string") {
            continue;
          }

          const fromMatch = addressSet.has(tx.from.toLowerCase());
          const toMatch = tx.to ? addressSet.has(tx.to.toLowerCase()) : false;

          let match: "from" | "to" | "both" | null = null;

          if (source.direction === "from") {
            match = fromMatch ? "from" : null;
          } else if (source.direction === "to") {
            match = toMatch ? "to" : null;
          } else {
            if (fromMatch && toMatch) {
              match = "both";
            } else if (fromMatch) {
              match = "from";
            } else if (toMatch) {
              match = "to";
            }
          }

          if (!match) {
            continue;
          }

          const event: WalletActivityNotification = {
            type: "walletActivity",
            watcherId: watcher.id,
            chainKey: chain.key,
            chainId: chain.chain.id,
            blockNumber: block.number ?? undefined,
            transactionHash: tx.hash,
            match,
            transaction: tx,
          };

          await this.dispatch(handler, context, watcher, chain, event);
        }
      },
      onError: (error) => {
        this.log.error(
          { watcherId: watcher.id, chainKey: chain.key, error },
          "Wallet watcher error",
        );
      },
    });

    return stop;
  }

  private async dispatch(
    handler: WatcherHandler,
    context: HandlerContext,
    watcher: WatcherDefinition,
    chain: ChainConfig,
    event: NormalizedEvent,
  ) {
    try {
      const result = await handler.handle(event, context);
      await this.pipelineManager.dispatch(watcher.pipelines, result, {
        watcher,
        chain,
        event,
      });
    } catch (error) {
      this.log.error(
        { watcherId: watcher.id, chainKey: chain.key, error },
        "Handler execution failed",
      );
    }
  }
}
