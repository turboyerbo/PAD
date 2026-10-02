# Connecting PAD to Supabase

Until this is done, PAD runs without accounts. The landing page offers "Start designing", and buildings are saved in that browser only.
Sign-in, Google, sharing, chat and unit comments are hidden, because they cannot work without a shared service.
Connecting Supabase switches all of them on and gives real accounts, buildings that sync between people, invites and live chat.

To try the hidden features locally without Supabase, add `?fulldemo` to the address (for example `http://localhost:8000/?fulldemo`).
That uses fake accounts kept in the browser and is for testing only.

You do these steps yourself in the Supabase and Google dashboards. Nothing here needs a server of your own.

## 1. Create the Supabase project

1. Sign in at https://supabase.com and create a project (the free plan is enough). Note the region and keep the database password somewhere safe.
2. Open the SQL Editor, create a new query, paste the whole of `supabase/schema.sql` and run it.
   It creates the tables, the security rules and the live-update settings. Run it once only.

## 2. Turn on email and password sign-in

Authentication > Providers > Email is on by default.
For quick testing you can switch off "Confirm email" (Authentication > Sign In / Providers > Email).
Leave it on for real use. People then confirm their address before signing in, and PAD tells them so.

## 3. Turn on Google sign-in

1. In the Google Cloud console, create an OAuth client ID of type "Web application".
2. Under Authorized redirect URIs add the callback address Supabase shows on its Google provider page. It looks like
   `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`.
3. In Supabase go to Authentication > Providers > Google, switch it on, and paste the Client ID and Client secret.

## 4. Tell Supabase where the app lives

Authentication > URL Configuration:

- Site URL: `https://padufs.netlify.app`
- Redirect URLs: add `https://padufs.netlify.app/**` and, to test pull requests, `https://deploy-preview-*--padufs.netlify.app/**`.
  For local work add `http://localhost:8000/**`.

## 5. Put the two public values into the app

In Supabase open Project settings > API. Copy the Project URL and the `anon` public key.
In `index.html`, near the top of the first script block, fill in:

```js
const SUPABASE_URL='https://YOUR-PROJECT-REF.supabase.co',SUPABASE_ANON_KEY='YOUR-ANON-KEY';
```

The anon key is meant to be public. The security rules in `schema.sql` decide what each person can see.
Never put the `service_role` key anywhere in this repository.

Bump `VERSION` in `sw.js`, open a pull request as usual, and check the deploy preview. The landing page note
"Demo mode" disappears once the values are filled in.

## How it behaves

- Each building is one row. Its units, edits and customizations are saved as JSON in that row.
- Saving is "last save wins". If two people edit at the same moment, the later save replaces the earlier one.
  PAD shows a message when a teammate's change arrives, and holds it until you close the editor.
- Invites do not send an email yet. The person is added as soon as they sign up or sign in with the invited address,
  so send them the site link yourself.
- Comments belong to a building and optionally to one unit (the unit number, for example PAD-04). They arrive live for everyone in the building.
- Passwords are handled entirely by Supabase. PAD never stores or sees them.

## Checking it works

1. Sign up with email and password, create a building, add a unit, reload. The building should still be there.
2. In the Supabase Table editor, `projects` should have one row and `project_members` one row with role `owner`.
3. Invite a second email from the Share button, sign up with it in another browser, and confirm the building appears.
4. Send a chat message from one and watch it appear in the other.
