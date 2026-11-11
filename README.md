# Nook — chat app with a real backend

React (Vite) front end, Supabase for the database, login, security rules and live updates.

```
src/App.jsx          the whole interface
src/api.js           every call to the backend
src/helpers.js       formatting helpers
src/supabaseClient.js
supabase/schema.sql  tables, security rules, server functions (run once)
```

## 1. Create the database (5 minutes)

1. Sign up at https://supabase.com and click **New project**. Save the database password somewhere safe.
2. When the project is ready, open **SQL Editor -> New query**, paste the whole of `supabase/schema.sql`, and click **Run**.
3. Open **Project Settings -> API** and copy the **Project URL** and the **anon public** key.
4. Open **Authentication -> Sign In / Providers -> Email**.
   - For quick testing, turn **Confirm email** off, so people can use the app right after signing up.
   - For a public site, leave it on (Supabase's built-in email sender is rate limited, so add your own SMTP provider under Authentication -> SMTP before real launch).

## 2. Run it on your computer

```bash
npm install
cp .env.example .env      # then paste your URL and anon key into .env
npm run dev
```

Open the address it prints. Create two accounts in two different browsers to try posts, private messages and groups.

## 3. Put it online (Vercel, free)

1. Create a GitHub repository and push this folder to it (`.env` is ignored, so your keys are not uploaded).
2. At https://vercel.com choose **Add New -> Project**, import the repository.
3. Under **Environment Variables** add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with the same values as your `.env`.
4. Click **Deploy**. Vercel gives you a live `https://your-app.vercel.app` address.
5. Back in Supabase, go to **Authentication -> URL Configuration** and set **Site URL** to that address. (Needed for confirmation emails to link to the right place.)

Netlify or Cloudflare Pages work the same way: build command `npm run build`, output folder `dist`, same two environment variables.

## How privacy works

The anon key in the browser is public by design. What protects data is Row Level Security in `schema.sql`:
- Posts and profiles can be read by any signed-in user; you can only create or delete your own.
- Chats, members and messages can only be read by members of that chat. Even someone calling the API directly cannot read other people's private messages.
- Creating chats, adding group members, leaving and deleting an account go through server functions that check who is calling.

## Known limits (good next steps)

- Each refresh loads your 1,500 most recent messages and the latest 60 posts. For a large audience, add paging.
- No images, typing indicators or push notifications yet.
- Deleting an account also deletes that person's posts and messages.
