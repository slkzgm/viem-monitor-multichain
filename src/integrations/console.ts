import { createScopedLogger } from "../shared/logger.js";
import type { AlertPayload, PipelineDispatchContext } from "../shared/types.js";

export class ConsoleIntegration {
  private readonly log = createScopedLogger({ integration: "console" });

  async send(payload: AlertPayload, context: PipelineDispatchContext) {
    const level = payload.severity ?? "info";
    const message = payload.title ?? `Watcher ${context.watcher.id} emitted an alert`;
    const body = payload.body;

    const structured = {
      watcherId: context.watcher.id,
      chainKey: context.chain.key,
      severity: payload.severity ?? "info",
      eventType: context.event.type,
      metadata: payload.metadata ?? {},
    };

    if (level === "error") {
      this.log.error(structured, message);
      this.log.error({ body }, "alert body");
    } else if (level === "warn") {
      this.log.warn(structured, message);
      this.log.warn({ body }, "alert body");
    } else if (level === "debug") {
      this.log.debug(structured, message);
      this.log.debug({ body }, "alert body");
    } else {
      this.log.info(structured, message);
      this.log.info({ body }, "alert body");
    }
  }
}
