import { EventEmitter } from "node:events";
import type { NormalizedEvent } from "../shared/types.js";

export type EventListener = (event: NormalizedEvent) => void | Promise<void>;

export class EventBus {
  private emitter = new EventEmitter({ captureRejections: true });

  publish(event: NormalizedEvent) {
    this.emitter.emit("event", event);
  }

  subscribe(listener: EventListener) {
    this.emitter.on("event", listener);
    return () => this.emitter.off("event", listener);
  }

  removeAll() {
    this.emitter.removeAllListeners();
  }
}
