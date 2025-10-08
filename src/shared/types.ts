import type { Abi, Chain, Log, Transaction } from "viem";
import type { Logger } from "pino";

export type WatcherSource = ContractEventSource | WalletActivitySource;

export interface ContractEventSource {
  type: "contractEvent";
  address: `0x${string}`;
  abi: Abi;
  eventName: string;
  args?: Record<string, unknown>;
  fromBlock?: bigint | "latest";
}

export interface WalletActivitySource {
  type: "walletActivity";
  addresses: `0x${string}`[];
  direction: "from" | "to" | "both";
  includePending?: boolean;
}

export interface WatcherDefinition {
  id: string;
  description?: string;
  chains: string[];
  handler: string;
  pipelines: string[];
  source: WatcherSource;
  tags?: string[];
  enabled?: boolean;
  options?: {
    batch?: boolean;
    throttleMs?: number;
  };
}

export interface ChainConfig {
  key: string;
  name: string;
  chain: Chain;
  transport: "websocket" | "http";
  rpcUrl: string;
  pollingIntervalMs?: number;
  enabled?: boolean;
  tags?: string[];
}

export interface PipelineConfig {
  id: string;
  description?: string;
  steps: PipelineStep[];
  enabled?: boolean;
}

export type PipelineStep =
  | ConsolePipelineStep
  | DiscordPipelineStep
  | TelegramPipelineStep;

export interface ConsolePipelineStep {
  type: "console";
  level?: "info" | "warn" | "error";
}

export interface DiscordPipelineStep {
  type: "discord";
  channelId: string;
  mentionRoleIds?: string[];
}

export interface TelegramPipelineStep {
  type: "telegram";
  chatId?: string;
  disableLinkPreview?: boolean;
}

export interface HandlerContext {
  watcher: WatcherDefinition;
  chain: ChainConfig;
  logger: Logger;
}

export interface HandlerInitParams {
  watcher: WatcherDefinition;
  chain: ChainConfig;
  logger: Logger;
}

export interface WatcherHandler {
  handle(event: NormalizedEvent, context: HandlerContext): Promise<HandlerResult>;
  shutdown?(): Promise<void>;
}

export type HandlerResult = AlertEnvelope[] | void;

export interface AlertPayload {
  severity?: "debug" | "info" | "warn" | "error";
  title?: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface AlertEnvelope {
  payload: AlertPayload;
  routeKey?: string;
}

export interface PipelineDispatchContext {
  watcher: WatcherDefinition;
  chain: ChainConfig;
  event: NormalizedEvent;
}

export interface AlertRouteConfig {
  pipelines: string[];
  description?: string;
}

export type AlertRoutingTable = Record<string, AlertRouteConfig>;

export type NormalizedEvent = ContractEventNotification | WalletActivityNotification;

export interface ContractEventNotification {
  type: "contractEvent";
  watcherId: string;
  chainKey: string;
  chainId: number;
  blockNumber?: bigint;
  transactionHash?: `0x${string}`;
  log: Log & { args?: Record<string, unknown> };
}

export interface WalletActivityNotification {
  type: "walletActivity";
  watcherId: string;
  chainKey: string;
  chainId: number;
  blockNumber?: bigint;
  transactionHash?: `0x${string}`;
  match: "from" | "to" | "both";
  transaction: Transaction;
}

export interface HandlerFactoryMap {
  [handlerId: string]: (params: HandlerInitParams) => WatcherHandler;
}

export interface PipelineRegistry {
  [pipelineId: string]: PipelineConfig;
}
