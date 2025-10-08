# All-Sight Multichain Runtime

New generation of the All-Sight monitoring platform. The goal is to run configurable watchers across multiple EVM chains and dispatch normalized events to alerting pipelines.

## Key Concepts

- **Chain Clients** – a registry-driven set of viem public clients, one per configured chain.
- **Watchers** – declarative definitions for contract events or wallet activity streams.
- **Handlers** – lightweight TypeScript modules that transform normalized events into domain actions.
- **Pipelines** – composable alert routes (Discord, Telegram, trading bots, etc.) configured outside of the handlers.

## Runtime Architecture

1. **Configuration load** – `src/app.ts` agrège les chaînes (`config/chains.ts`), les watchers (`config/watchers.ts`), les pipelines (`config/pipelines.ts`) et la table de routage (`config/routing.ts`).
2. **ChainClientManager** – instancie un client viem par chaîne active et gère la reconnexion (`runtime/chainClientManager.ts`).
3. **WatcherEngine** – crée les watchers déclarés (événements de contrats ou activité wallets), normalise les événements et invoque les handlers (`runtime/watcherEngine.ts`).
4. **Handlers** – transforment l’événement en une liste d’`AlertEnvelope` avec un `routeKey` décrivant la catégorie d’alerte (`handlers/**/*.ts`).
5. **PipelineManager** – résout le `routeKey` vers une ou plusieurs pipelines, puis expédie les alertes via les intégrations actives (`runtime/pipelineManager.ts`, `integrations/*`).

Cette séparation `watcher → handler → pipelines` permet d’ajouter une chaîne, un flux ou un canal sans dupliquer la logique métier.

## Repository Layout

```
src/
  app.ts               # runtime bootstrap
  config/              # chain, watcher, and pipeline definitions
  runtime/             # orchestrator core (managers, registry, event bus)
  handlers/            # domain-specific logic (to be implemented incrementally)
  integrations/        # outbound clients with pluggable transports
  shared/              # logging, metrics, common types
  tests/               # unit and integration harnesses
```

## Getting Started

```
pnpm install
pnpm dev
```

Development relies on environment variables defined in `.env`. Copy `.env.example` once it is added.

## Configuration Reference

### Chains (`src/config/chains.ts`)
- Chaque entrée contient `key`, `chain`, `transport`, `rpcUrl`, `enabled`.
- Une chaîne sans URL RPC (variable absente) est automatiquement désactivée.

### Watchers (`src/config/watchers.ts`)
- Décrivent la source (`contractEvent` ou `walletActivity`), les chaînes ciblées et le handler à instancier.
- Le champ `pipelines` sert de fallback si le handler ne fournit pas de `routeKey`.

### Handlers (`src/handlers/`)
- Reçoivent un événement normalisé et retournent des `AlertEnvelope { payload, routeKey? }`.
- Le `routeKey` permet de router dynamiquement vers des pipelines spécifiques (ex. `contracts.deployed.erc20`).

### Pipelines (`src/config/pipelines.ts`)
- Représentent un circuit d’envoi concret (console, Telegram, etc.).
- Les paramètres sensibles (tokens, chatId) proviennent de `.env`.

### Routing (`src/config/routing.ts`)
- Mappe chaque `routeKey` logique à une ou plusieurs pipelines.
- Modifier la destination d’un flux se fait ici, sans changer watchers ni handlers.

### Ajouter une nouvelle chaîne

1. Déclare l'URL RPC dans `.env` (ex. `CHAIN_RPC_ETHEREUM_MAINNET=wss://...`).
2. Ajoute une entrée correspondante dans `src/config/chains.ts` en pointant vers le `Chain` viem adapté.
3. Associe la clé de chaîne à tes watchers dans `src/config/watchers.ts` (`chains: ["abstract-mainnet", "ethereum-mainnet"]`).
4. Relance `pnpm dev` pour démarrer les clients et watchers sur la nouvelle chaîne.

### Activer Telegram

1. Renseigne `TELEGRAM_TOKEN` et, si besoin, `TELEGRAM_DEFAULT_CHAT_ID` dans `.env`.
2. Configure les salons dédiés via `TELEGRAM_CONTRACTS_ERC20_CHAT_ID`, `TELEGRAM_CONTRACTS_ERC721_CHAT_ID`, `TELEGRAM_CONTRACTS_UNKNOWN_CHAT_ID`, etc.
3. Vérifie / ajuste les pipelines Telegram dans `src/config/pipelines.ts` (un pipeline par salon).
4. Relance `pnpm dev` : les alertes seront dirigées selon les règles définies dans `src/config/routing.ts`.

### Router les alertes par type

- Les handlers retournent un `routeKey` (ex. `"contracts.deployed.erc20"`) via `AlertEnvelope`.
- Le mapping `routeKey -> pipelines` se gère dans `src/config/routing.ts` (ex. associer `contracts.deployed.erc721` au pipeline `telegram-contracts-erc721`).
- Si aucune correspondance n’est trouvée, le runtime retombe sur les pipelines déclarés sur le watcher.
- Ajouter une nouvelle destination = référencer la clé de routage côté handler puis déclarer les pipelines cibles (Discord, Telegram, etc.) dans `routing.ts`.


### Exemple : router les déploiements vers différents salons

- `src/handlers/demo/contractDeployedDemoHandler.ts` identifie la catégorie (mock) et émet un `routeKey` `contracts.deployed.<cat>`. Remplace la détection par une introspection réelle (lecture d’ABI/bytecode) pour la prod.
- `src/config/routing.ts` associe chaque catégorie aux pipelines Telegram dédiées en complément de `dev-console`.
- `src/config/pipelines.ts` lit les `TELEGRAM_CONTRACTS_*_CHAT_ID` depuis `.env` pour cibler les salons appropriés.
- Les watchers restent inchangés : un seul watcher traite tous les déploiements, mais chaque catégorie part dans son canal.

### Ajouter un nouveau flux d’alerte

1. Expose un `routeKey` dans ton handler (ou crée un nouveau handler si besoin).
2. Déclare les pipelines physiques dans `src/config/pipelines.ts` (Discord, webhook, etc.).
3. Enregistre la clé dans `src/config/routing.ts` avec la liste de pipelines cibles.
4. Ajoute la nouvelle pipeline au champ `pipelines` des watchers concernés pour définir le fallback.
5. Documente les variables d’environnement associées dans `.env.example`, relance `pnpm dev`, et vérifie les logs/alertes.
