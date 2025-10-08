import { createScopedLogger } from "../shared/logger.js";
import type {
  AlertEnvelope,
  AlertPayload,
  AlertRoutingTable,
  PipelineConfig,
  PipelineDispatchContext,
  PipelineStep,
} from "../shared/types.js";
import { ConsoleIntegration } from "../integrations/console.js";
import { TelegramIntegration } from "../integrations/telegram.js";

interface PipelineStepExecutor {
  send(payload: AlertPayload, context: PipelineDispatchContext): Promise<void>;
}

interface Pipeline {
  id: string;
  steps: PipelineStepExecutor[];
}

export class PipelineManager {
  private readonly log = createScopedLogger({ scope: "PipelineManager" });
  private readonly pipelines = new Map<string, Pipeline>();
  private readonly consoleIntegration = new ConsoleIntegration();
  private readonly telegramIntegration = new TelegramIntegration();
  private readonly routing: AlertRoutingTable;

  constructor(pipelineConfigs: PipelineConfig[], routing: AlertRoutingTable) {
    this.routing = routing;
    for (const pipelineConfig of pipelineConfigs) {
      if (pipelineConfig.enabled === false) {
        this.log.debug({ pipelineId: pipelineConfig.id }, "Skipping disabled pipeline");
        continue;
      }

      const stepExecutors: PipelineStepExecutor[] = pipelineConfig.steps.map(
        (step: PipelineStep) => this.createStepExecutor(step, pipelineConfig.id),
      );

      this.pipelines.set(pipelineConfig.id, {
        id: pipelineConfig.id,
        steps: stepExecutors,
      });
    }
  }

  async dispatch(
    defaultPipelineIds: string[],
    envelopes: AlertEnvelope[] | void,
    context: PipelineDispatchContext,
  ) {
    if (!envelopes || envelopes.length === 0) {
      return;
    }

    for (const envelope of envelopes) {
      const pipelineIds = this.resolvePipelineIds(envelope.routeKey, defaultPipelineIds);

      if (!pipelineIds || pipelineIds.length === 0) {
        this.log.warn(
          {
            watcherId: context.watcher.id,
            chainKey: context.chain.key,
            routeKey: envelope.routeKey,
          },
          "No pipelines resolved for alert",
        );
        continue;
      }

      for (const pipelineId of pipelineIds) {
        const pipeline = this.pipelines.get(pipelineId);
        if (!pipeline) {
          this.log.warn({ pipelineId }, "Pipeline not found, skipping");
          continue;
        }

        for (const executor of pipeline.steps) {
          await executor.send({ ...envelope.payload }, context);
        }
      }
    }
  }

  private resolvePipelineIds(
    routeKey: string | undefined,
    defaultPipelineIds: string[],
  ): string[] {
    if (!routeKey) {
      return defaultPipelineIds;
    }

    const entry = this.routing[routeKey];
    if (!entry || entry.pipelines.length === 0) {
      this.log.warn(
        { routeKey },
        "Route key not configured, falling back to watcher pipelines",
      );
      return defaultPipelineIds;
    }

    return entry.pipelines;
  }

  private createStepExecutor(
    step: PipelineStep,
    pipelineId: string,
  ): PipelineStepExecutor {
    if (step.type === "console") {
      const level = step.level ?? "info";
      return {
        send: async (payload, context) => {
          if (!payload.severity) {
            payload.severity = level;
          }
          await this.consoleIntegration.send(payload, context);
        },
      };
    }

    if (step.type === "telegram") {
      return {
        send: async (payload, context) => {
          await this.telegramIntegration.send(payload, context, {
            chatId: step.chatId,
            disableLinkPreview: step.disableLinkPreview,
          });
        },
      };
    }

    this.log.warn(
      { pipelineId, stepType: (step as PipelineStep).type },
      "Unsupported pipeline step type",
    );

    return {
      send: async () => {
        // no-op for unsupported steps
      },
    };
  }
}
