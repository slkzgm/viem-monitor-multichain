import type { PipelineConfig } from "../shared/types.js";

export const pipelines: PipelineConfig[] = [
  {
    id: "dev-console",
    description: "Console pipeline for local development.",
    steps: [
      {
        type: "console",
        level: "info",
      },
    ],
    enabled: true,
  },
  {
    id: "telegram-default",
    description: "Exemple de pipeline Telegram (désactivée).",
    steps: [
      {
        type: "telegram",
      },
    ],
    enabled: false,
  },
];
