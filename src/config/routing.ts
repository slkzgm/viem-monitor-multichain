import type { AlertRouteConfig, AlertRoutingTable } from "../shared/types.js";

export const alertRouting: AlertRoutingTable = {
  "contracts.deployed.erc20": {
    pipelines: ["dev-console", "telegram-contracts-erc20"],
    description: "Déploiements identifiés comme ERC-20",
  },
  "contracts.deployed.erc721": {
    pipelines: ["dev-console", "telegram-contracts-erc721"],
    description: "Déploiements identifiés comme ERC-721",
  },
  "contracts.deployed.unknown": {
    pipelines: ["dev-console", "telegram-contracts-unknown"],
    description: "Déploiements non catégorisés",
  },
  "demo.wallet.activity": {
    pipelines: ["dev-console", "telegram-wallet-activity"],
    description: "Route générique pour l'activité wallet de démonstration",
  },
};

export function resolveRoutePipelines(routeKey: string): string[] | undefined {
  const entry: AlertRouteConfig | undefined = alertRouting[routeKey];
  return entry?.pipelines;
}
