import type { HandlerFactoryMap } from "../shared/types.js";
import { createContractDeployedDemoHandler } from "./demo/contractDeployedDemoHandler.js";
import { createWalletActivityDemoHandler } from "./demo/walletActivityDemoHandler.js";

export const handlerFactories: HandlerFactoryMap = {
  "demo-contract-deployed": createContractDeployedDemoHandler,
  "demo-wallet-activity": createWalletActivityDemoHandler,
};

export function getHandlerFactory(handlerId: string) {
  const factory = handlerFactories[handlerId];
  if (!factory) {
    throw new Error(`Unknown handler: ${handlerId}`);
  }
  return factory;
}
