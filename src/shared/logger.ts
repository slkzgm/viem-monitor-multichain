import pino from "pino";

const level =
  process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug");

export const logger = pino({
  level,
  transport:
    process.env.NODE_ENV === "production"
      ? undefined
      : {
          target: "pino-pretty",
          options: {
            colorize: true,
            singleLine: true,
            translateTime: "SYS:standard",
          },
        },
});

export function createScopedLogger(scope: Record<string, unknown>) {
  return logger.child(scope);
}
