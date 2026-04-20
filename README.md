# llog

## Development Setup

1. Install dependencies

   ```bash
   bun i
   ```

2. Add local app environment variables

   ```bash
   # .env.development

   CLOUDFLARED_TOKEN=<YOUR_CLOUDFLARED_TOKEN>
   EXPO_PUBLIC_API_URL=<YOUR_URL>/api/v1
   EXPO_PUBLIC_APP_URL=<YOUR_URL>
   EXPO_PUBLIC_INSTANT_APP_ID=<YOUR_ID>
   EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY=<YOUR_PUBLIC_VAPID_KEY>
   ```

3. Add local Worker secrets for `wrangler dev`

   ```bash
   # .dev.vars

   INSTANT_APP_ADMIN_TOKEN=<YOUR_TOKEN>
   INSTANT_APP_ID=<YOUR_ID>
   MAILTO_CONTACT=mailto:<YOUR_EMAIL>
   CLOUDFLARE_ACCOUNT_ID=<YOUR_ACCOUNT_ID>
   CLOUDFLARE_IMAGES_API_TOKEN=<YOUR_IMAGES_API_TOKEN>
   CLOUDFLARE_STREAM_API_TOKEN=<YOUR_STREAM_API_TOKEN>
   CLOUDFLARE_STREAM_WEBHOOK_SECRET=<YOUR_STREAM_WEBHOOK_SECRET>
   WEB_PUSH_VAPID_PRIVATE_KEY=<YOUR_PRIVATE_VAPID_JWK_JSON>
   ```

   Generate a keypair with:

   ```bash
   bun run generate:vapid
   ```

4. Generate types

   ```bash
   bun types
   ```

5. Optionally, create iOS/Android builds

   ```bash
   bun prebuild
   bun ios
   bun android
   ```

6. Start the dev server

   ```bash
   bun web
   ```

## Production Secrets

Production secret bulk upload reads from `.dev.vars.production`.

```bash
INSTANT_APP_ADMIN_TOKEN=<YOUR_TOKEN>
INSTANT_APP_ID=<YOUR_ID>
MAILTO_CONTACT=mailto:<YOUR_EMAIL>
CLOUDFLARE_ACCOUNT_ID=<YOUR_ACCOUNT_ID>
CLOUDFLARE_IMAGES_API_TOKEN=<YOUR_IMAGES_API_TOKEN>
CLOUDFLARE_STREAM_API_TOKEN=<YOUR_STREAM_API_TOKEN>
CLOUDFLARE_STREAM_WEBHOOK_SECRET=<YOUR_STREAM_WEBHOOK_SECRET>
WEB_PUSH_VAPID_PRIVATE_KEY=<YOUR_PRIVATE_VAPID_JWK_JSON>
```

## Deploy

Build and deploy with:

```bash
bun run build
bun run push
```
