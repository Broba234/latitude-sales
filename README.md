# Latitude Sales — One-Page Parallax Site + Admin

Simple, elegant single-page website for a multi-brand clothing sales agency, with a lightweight admin at `/admin` powered by Supabase (Auth, Database, Storage). Served by a tiny Node static server so you can test with `node`.

## Quick Start

1) Install nothing — just use Node.

2) Copy config and add your Supabase details:

```bash
cp public/config.example.js public/config.js
```

Edit `public/config.js` with your `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Optionally change the storage bucket name (defaults to `collections`).

3) Run the server:

```bash
node server.js
```

Visit `http://localhost:3000` for the site, and `http://localhost:3000/admin` for the admin.

## Supabase Setup

### 1. Database Table

Create a table named `collections`:

```sql
-- Table: collections
create table if not exists public.collections (
  id bigint generated always as identity primary key,
  name text not null,
  link_url text not null,
  image_url text,
  active boolean not null default true,
  sort_order int default 0,
  created_at timestamp with time zone not null default now()
);

alter table public.collections enable row level security;
```

Policies:

```sql
-- Public can read active collections only (for the website)
create policy "read active collections"
  on public.collections for select
  to anon
  using (active = true);

-- Authenticated users can do everything (admin panel)
create policy "admin full access"
  on public.collections for all
  to authenticated
  using (true)
  with check (true);
```

### 2. Storage Bucket

Create a Storage bucket (default name: `collections`). Make it public for read so images can render on the website. Restrict upload/write to authenticated users only.

Optionally, set a bucket public policy such as:

```sql
-- Public read
create policy "public read"
on storage.objects for select
to public
using ( bucket_id = 'collections' );

-- Authenticated can write
create policy "authenticated write"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'collections' );

create policy "authenticated update"
on storage.objects for update
to authenticated
using ( bucket_id = 'collections' )
with check ( bucket_id = 'collections' );

create policy "authenticated delete"
on storage.objects for delete
to authenticated
using ( bucket_id = 'collections' );
```

### 3. Auth

- Create an admin user in Supabase Auth (email/password).
- Use those credentials to sign in at `/admin`.

### 4. CORS

In Supabase Settings → Auth → URL Configuration, add `http://localhost:3000` as an allowed origin so the browser client can talk to Supabase during local development.

## How It Works

- `server.js`: tiny static server for local testing.
- `public/index.html`: one-page parallax site with hero, story, collections, and contact.
- `public/script.js`: fetches `collections` from Supabase and renders the hoverable grid.
- `public/admin.html` + `public/admin.js`: admin UI with Supabase Auth login and CRUD for collections. Images are uploaded to your Storage bucket and the public URL is saved to the row.
- `public/styles.css`: clean, responsive styling with subtle parallax and hover effects.

## Notes

- If you don’t yet have hero/collections background images, the page falls back to soft gradients.
- Real Supabase credentials should go only in `public/config.js` (not committed). `.gitignore` already excludes it.
- You can rename the storage bucket; update `SUPABASE_STORAGE_BUCKET` in your config accordingly.

