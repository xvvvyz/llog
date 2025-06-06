# llog

## Development Setup

1. Install dependencies

   ```bash
   bun i
   ```

2. Add environment variables

   ```bash
   # .env

   EXPO_PUBLIC_API_URL=http://localhost:8787/v1
   EXPO_PUBLIC_INSTANT_APP_ID=<YOUR_ID>
   ```

   ```bash
   # .dev.vars

   INSTANT_APP_ADMIN_TOKEN=<YOUR_TOKEN>
   INSTANT_APP_ID=<YOUR_ID>
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
