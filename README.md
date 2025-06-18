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
   bun types
   ```

4. Optionally, create iOS/Android builds

   ```bash
   bun ios
   bun android
   ```

5. Start the dev server

   ```bash
   bun dev
   ```
