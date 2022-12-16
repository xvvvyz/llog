## Development Setup

Install [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git),
[Node](https://nodejs.org/en/download) and
[Docker](https://docs.docker.com/engine/install), then:

```shell
git clone git@github.com:xvvvyz/llog.git
cd llog
npm i
npm run db:start # outputs supabase url & key
```

Add the following to your `.env` file:

```dotenv
NEXT_PUBLIC_SUPABASE_ANON_KEY=<SUPABASE_ANON_KEY>
NEXT_PUBLIC_SUPABASE_URL=<SUPABSE_API_URL>

# optimize images with supabase instead of next
NEXT_PUBLIC_SUPABASE_PRO=1
```

Generate types and start the dev server:

```shell
npm run db:types
npm start
```

If you modify the database schema:

```shell
npm run db:types
npm run db:diff -- migration_description
```
