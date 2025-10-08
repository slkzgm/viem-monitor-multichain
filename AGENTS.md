# Repository Guidelines

## Architecture & Structure
- Runtime entrypoint `src/app.ts` charge les configurations et démarre `ChainClientManager`, `WatcherEngine`, `PipelineManager`.
- Configurations dans `src/config/`: `chains.ts`, `watchers.ts`, `pipelines.ts`, `routing.ts` décrivent respectivement réseaux, sources, canaux et règles de routage.
- Logique métier sous `src/handlers/` (utiliser les sous-dossiers par domaine). Chaque handler renvoie des `AlertEnvelope` avec option `routeKey`.
- Intégrations externes regroupées dans `src/integrations/` (console, Telegram, Discord à venir).
- Code partagé (`types`, logger) dans `src/shared/`; l’orchestrateur dans `src/runtime/`.

## Développement & Commandes
- `pnpm install` pour installer les dépendances (Node 18+ recommandé).
- `pnpm dev` lance le runtime via `tsx` (charge `.env` automatiquement).
- `pnpm typecheck` exécute `tsc --noEmit` (corrige les erreurs d'import `.js` si le compilateur les signale).
- `pnpm format` applique Prettier (`prettier.config.js`).

## Configuration Workflow
1. **Chains** – ajouter/modifier dans `config/chains.ts`, documenter les variables RPC dans `.env.example`.
2. **Watchers** – définir la source (`contractEvent` / `walletActivity`), les chaînes cibles et le handler.
3. **Handlers** – renvoyer `AlertEnvelope { payload, routeKey? }`; utiliser des `routeKey` stables (`domaine.sousdomaine.action`).
4. **Pipelines** – créer/éditer dans `config/pipelines.ts` (un pipeline par canal, lire les secrets depuis `.env`).
5. **Routing** – mapper le `routeKey` vers les pipelines dans `config/routing.ts`; ajouter une règle suffit pour changer de canal.
6. **Intégrations** – centraliser la logique spécifique (Telegram, Discord, etc.) dans `integrations/`.

## Coding Standards
- TypeScript strict, ES2020, CommonJS (`moduleResolution: node`).
- Imports relatifs depuis `src/` uniquement; pas d’alias implicites.
- Préférer les fonctions pures, side-effects explicités (loggers via `createScopedLogger`).
- Garder les handlers sans état; stocker caches/services partagés dans `runtime/` ou `shared/`.
- Comments courts pour le contexte métier, éviter les commentaires évidents.

## Tests & Validation
- `pnpm typecheck` exécute `tsc --noEmit` (corrige les erreurs d'import `.js` si le compilateur les signale).
- `pnpm dev` avec `.env` pointant vers un RPC de test (anvil, sepolia) pour valider les watchers.
- Ajouter des harnesses ciblés dans `src/tests/` (utiliser `tsx` pour les exécuter manuellement). Documenter toute dépendance externe dans l’entête du fichier.

## Commit & PR Guidelines
- Conserver les conventions `feat:`, `fix:`, `chore:`.
- Décrire l’impact opérationnel (nouvelles chaînes, watchers, pipelines) et les validations effectuées.
- Joindre les extraits de log pertinents (ex. message Telegram simulé) quand on touche aux alertes.
- Ne jamais commettre de secrets ; documenter les nouvelles variables dans `.env.example` et `README.md`.
