import type { WatcherDefinition } from "../shared/types.js";

const contractDeployedAbi = [
  {
    type: "event",
    name: "ContractDeployed",
    inputs: [
      { type: "address", name: "deployerAddress", indexed: true },
      { type: "bytes32", name: "bytecodeHash", indexed: true },
      { type: "address", name: "contractAddress", indexed: true },
    ],
  },
] as const;

export const watchers: WatcherDefinition[] = [
  {
    id: "demo-contract-deployed",
    description: "Demo watcher for Abstract contract deployments.",
    chains: ["abstract-mainnet"],
    handler: "demo-contract-deployed",
    pipelines: ["dev-console"],
    source: {
      type: "contractEvent",
      address: "0x0000000000000000000000000000000000008006",
      abi: contractDeployedAbi,
      eventName: "ContractDeployed",
    },
    tags: ["demo"],
    enabled: true,
  },
  {
    id: "demo-wallet-activity",
    description: "Demo watcher that monitors wallet transfers.",
    chains: ["abstract-mainnet"],
    handler: "demo-wallet-activity",
    pipelines: ["dev-console"],
    source: {
      type: "walletActivity",
      addresses: [
        "0x1B2C84dd7957b1e207Cd7b01Ded77984eC16fDEf",
        "0x700d7b774f5af65d26e5b9ae969ca9611ff80f6d",
      ],
      direction: "both",
      includePending: false,
    },
    tags: ["demo"],
    enabled: true,
  },
];
