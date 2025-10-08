import type {
  HandlerInitParams,
  WatcherHandler,
  HandlerContext,
  HandlerResult,
  ContractEventNotification,
} from "../../shared/types.js";

type ContractCategory = "erc20" | "erc721" | "unknown";

function inferContractCategory(event: ContractEventNotification): ContractCategory {
  const args = event.log.args as Record<string, unknown> | undefined;
  const contractAddress = (args?.contractAddress as string | undefined)?.toLowerCase();
  const bytecodeHash = (args?.bytecodeHash as string | undefined)?.toLowerCase();

  // TODO: remplacer par une introspection réelle du bytecode ou une registry contract.
  if (contractAddress) {
    if (contractAddress.endsWith("721") || contractAddress.includes("721")) {
      return "erc721";
    }
    if (contractAddress.endsWith("20") || contractAddress.includes("20")) {
      return "erc20";
    }
  }

  if (bytecodeHash) {
    if (bytecodeHash.includes("721")) {
      return "erc721";
    }
    if (bytecodeHash.includes("20")) {
      return "erc20";
    }
  }

  return "unknown";
}

export function createContractDeployedDemoHandler(
  params: HandlerInitParams,
): WatcherHandler {
  const scopedLogger = params.logger.child({
    handler: "demo-contract-deployed",
    watcherId: params.watcher.id,
    chainKey: params.chain.key,
  });

  return {
    async handle(
      event: ContractEventNotification,
      context: HandlerContext,
    ): Promise<HandlerResult> {
      if (event.type !== "contractEvent") {
        return;
      }

      const args = event.log.args as Record<string, unknown> | undefined;
      const deployer = args?.deployerAddress as string | undefined;
      const contractAddress = args?.contractAddress as string | undefined;
      const category = inferContractCategory(event);

      scopedLogger.info(
        {
          watcherId: event.watcherId,
          transactionHash: event.transactionHash,
        },
        "Received contract deployment event",
      );

      return [
        {
          routeKey: `contracts.deployed.${category}`,
          payload: {
            severity: "info",
            title: `[${context.chain.name}] Contract deployed`,
            body: `Deployer ${deployer ?? "unknown"} deployed contract ${
              contractAddress ?? event.log.address
            }`,
            metadata: {
              transactionHash: event.transactionHash,
              blockNumber: event.blockNumber?.toString(),
              category,
            },
          },
        },
      ];
    },
    async shutdown() {
      scopedLogger.info("Shutting down demo contract deployed handler");
    },
  } as WatcherHandler;
}
