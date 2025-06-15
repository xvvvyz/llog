# llog

## Development Setup

1. Install dependencies

   ```bash
   bun i
   ```

2. Add environment variables

   ```bash
   # .env.development.local

   EXPO_PUBLIC_INSTANT_APP_ID=<YOUR_ID>
   ```

   ```bash
   # .dev.vars.development

   AGENT_EMAIL_DOMAIN=<YOUR_DOMAIN>
   ANTHROPIC_API_KEY=<YOUR_KEY>
   GOOGLE_API_KEY=<YOUR_KEY>
   INSTANT_APP_ADMIN_TOKEN=<YOUR_TOKEN>
   INSTANT_APP_ID=<YOUR_ID>
   OPENAI_API_KEY=<YOUR_KEY>
   WEATHER_API_KEY=<YOUR_KEY>
   XAI_API_KEY=<YOUR_KEY>
   ```

3. Generate types

   ```bash
   bun api:types
   ```

4. Start the API

   ```bash
   bun api:dev
   ```

5. Start the app

   ```bash
   bun app:dev
   ```
