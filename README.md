# llog

## Development Setup

1. Install dependencies

   ```bash
   bun i
   ```

2. Add environment variables

   ```bash
   # .env.development

   EXPO_PUBLIC_INSTANT_APP_ID=<YOUR_ID>
   EXPO_PUBLIC_API_URL=http://localhost:8787/api/v1
   ```

   ```bash
   # .dev.vars.development

   INSTANT_APP_ADMIN_TOKEN=<YOUR_TOKEN>
   INSTANT_APP_ID=<YOUR_ID>
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
