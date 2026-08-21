# Anchorite Cafe Deployment

## Supabase

1. Create a new Supabase project for Anchorite Cafe.
2. Open SQL Editor and run `supabase/schema.sql`.
3. Copy the project URL and anon public key from Project Settings > API.
4. Add these variables to Vercel:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Push notifications also need:

```text
VITE_VAPID_PUBLIC_KEY
```

Leave `VITE_VAPID_PUBLIC_KEY` blank until push notifications are configured.

## Vercel

1. Import `StThomastheHermit/AnchoriteCafe` from GitHub.
2. Framework preset: Vite.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Add the Supabase environment variables above.
6. Deploy.

`vercel.json` already rewrites all routes to `index.html`, so `/admin` and display routes can load directly.
