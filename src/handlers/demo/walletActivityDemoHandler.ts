import type {
  HandlerContext,
  HandlerInitParams,
  HandlerResult,
  WatcherHandler,
  WalletActivityNotification,
} from "../../shared/types.js";

export function createWalletActivityDemoHandler(
  params: HandlerInitParams,
): WatcherHandler {
  const scopedLogger = params.logger.child({
    handler: "demo-wallet-activity",
    watcherId: params.watcher.id,
    chainKey: params.chain.key,
  });

  return {
    async handle(
      event: WalletActivityNotification,
      context: HandlerContext,
    ): Promise<HandlerResult> {
      if (event.type !== "walletActivity") {
        return;
      }

      scopedLogger.info(
        {
          watcherId: event.watcherId,
          transactionHash: event.transactionHash,
          match: event.match,
        },
        "Received wallet activity event",
      );

      const directionLabel =
        event.match === "both" ? "from/to" : event.match === "from" ? "from" : "to";

      return [
        {
          routeKey: "demo.wallet.activity",
          payload: {
            severity: "info",
            title: `[${context.chain.name}] Wallet activity detected`,
            body: `Transaction ${event.transactionHash ?? "<pending>"} matched ${directionLabel} filter for watcher ${context.watcher.id}.`,
            metadata: {
              from: event.transaction.from,
              to: event.transaction.to,
              hash: event.transactionHash,
            },
          },
        },
      ];
    },
    async shutdown() {
      scopedLogger.info("Shutting down demo wallet activity handler");
    },
  } as WatcherHandler;
}
