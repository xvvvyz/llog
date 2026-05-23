declare namespace Cloudflare {
  interface Env {
    OPENAI_STT_MODEL: string;
    OPENROUTER_CARD_MODEL: string;
  }

  interface ProductionEnv {
    OPENAI_STT_MODEL: string;
    OPENROUTER_CARD_MODEL: string;
  }
}
