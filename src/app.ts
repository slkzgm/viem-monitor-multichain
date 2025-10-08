import "dotenv/config";
import { logger } from "./shared/logger.js";
import { chains } from "./config/chains.js";
import { watchers } from "./config/watchers.js";
import { pipelines } from "./config/pipelines.js";
import { alertRouting } from "./config/routing.js";
import { ChainClientManager } from "./runtime/chainClientManager.js";
import { PipelineManager } from "./runtime/pipelineManager.js";
import { WatcherEngine } from "./runtime/watcherEngine.js";

async function main() {
  logger.info(
    { chains: chains.length, watchers: watchers.length },
    "Starting All-Sight multichain runtime",
  );

  const chainClientManager = new ChainClientManager(chains);
  chainClientManager.initialize();

  const pipelineManager = new PipelineManager(pipelines, alertRouting);
  const watcherEngine = new WatcherEngine(chainClientManager, pipelineManager);

  watcherEngine.start(watchers);

  const shutdown = async (signal: NodeJS.Signals) => {
    logger.warn({ signal }, "Received shutdown signal");
    await watcherEngine.shutdown();
    process.exit(0);
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
  logger.error({ error }, "Fatal error during runtime bootstrap");
  process.exit(1);
});
