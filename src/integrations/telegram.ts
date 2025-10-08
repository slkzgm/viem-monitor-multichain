import TelegramBot from "node-telegram-bot-api";
import { createScopedLogger } from "../shared/logger.js";
import type { AlertPayload, PipelineDispatchContext } from "../shared/types.js";

interface TelegramSendOptions {
  chatId?: string;
  disableLinkPreview?: boolean;
}

export class TelegramIntegration {
  private readonly log = createScopedLogger({ integration: "telegram" });
  private readonly token = process.env.TELEGRAM_TOKEN;
  private readonly defaultChatId = process.env.TELEGRAM_DEFAULT_CHAT_ID;
  private bot: TelegramBot | null = null;
  private warnedMissingToken = false;

  constructor() {
    if (this.token) {
      this.bot = new TelegramBot(this.token, { polling: false });
    }
  }

  async send(
    payload: AlertPayload,
    context: PipelineDispatchContext,
    options: TelegramSendOptions = {},
  ) {
    if (!this.bot) {
      if (!this.warnedMissingToken) {
        this.log.warn(
          {
            watcherId: context.watcher.id,
            chainKey: context.chain.key,
          },
          "TELEGRAM_TOKEN manquant, envoi ignoré",
        );
        this.warnedMissingToken = true;
      }
      return;
    }

    const chatId = options.chatId ?? this.defaultChatId;
    if (!chatId) {
      this.log.warn(
        {
          watcherId: context.watcher.id,
          chainKey: context.chain.key,
        },
        "Aucun chatId Telegram fourni, envoi ignoré",
      );
      return;
    }

    const lines: string[] = [];
    const title = payload.title ?? `Alerte ${context.watcher.id}`;
    lines.push(`🚨 ${title}`);
    lines.push(payload.body);

    if (payload.metadata && Object.keys(payload.metadata).length > 0) {
      lines.push("\nMeta :");
      for (const [key, value] of Object.entries(payload.metadata)) {
        lines.push(`- ${key}: ${String(value)}`);
      }
    }

    const message = lines.join("\n");

    try {
      await this.bot.sendMessage(chatId, message, {
        disable_web_page_preview: options.disableLinkPreview ?? true,
      });
      this.log.debug(
        {
          watcherId: context.watcher.id,
          chainKey: context.chain.key,
          chatId,
        },
        "Alerte Telegram envoyée",
      );
    } catch (error) {
      this.log.error(
        {
          watcherId: context.watcher.id,
          chainKey: context.chain.key,
          chatId,
          error,
        },
        "Échec d'envoi Telegram",
      );
    }
  }
}
