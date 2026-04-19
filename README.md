# llog

## Development Setup

1. Install dependencies

   ```bash
   bun i
   ```

2. Add environment variables

   ```bash
   # .env.development

   CLOUDFLARED_TOKEN=<YOUR_CLOUADFLARED_TOKEN>
   EXPO_PUBLIC_API_URL=<YOUR_URL>/api/v1
   EXPO_PUBLIC_APP_URL=<YOUR_URL>
   EXPO_PUBLIC_INSTANT_APP_ID=<YOUR_ID>
   EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY=<YOUR_PUBLIC_VAPID_KEY>
   ```

   ```bash
   # .dev.vars.development

   INSTANT_APP_ADMIN_TOKEN=<YOUR_TOKEN>
   INSTANT_APP_ID=<YOUR_ID>
   MAILTO_CONTACT=mailto:<YOUR_EMAIL>
   WEB_PUSH_VAPID_PRIVATE_KEY=<YOUR_PRIVATE_VAPID_JWK_JSON>
   ```

   Generate a keypair with:

   ```bash
   bun run generate:vapid
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
   bun dev:tunnel
   bun dev
   ```
