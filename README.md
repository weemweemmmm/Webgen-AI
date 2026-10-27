# WebGen AI

## Run locally

Install dependencies and start the development server from the repository root:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

The app requires Supabase for account registration and sign-in:

1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to your Supabase project values.
3. Run `supabase/schema.sql` in the Supabase SQL Editor.
4. Restart the development server.

Set `GEMINI_API_KEY` in `.env.local` as well to enable AI website generation. Keep it server-only; do not add the `NEXT_PUBLIC_` prefix.

## Verify and run in production

```bash
npm run lint
npm run build
npm run start
```
