# Deploying budgetenduro.com.au

Static site. Nothing to build. Two ways to get it live.

## Option A — Claude Code (hands off)

From this folder, run `claude` and paste:

> Create a private GitHub repo called budget-enduro, commit everything in this
> folder, push it, then deploy to Vercel with the Vercel CLI. Stop before adding
> the custom domain and tell me the preview URL.

Claude Code has real git and shell access, so it can do the repo, the commit,
the push and the deploy. It will prompt you to authenticate GitHub and Vercel —
those logins are yours to complete, nobody can do that part for you.

## Option B — do it yourself (about five minutes)

```bash
cd budget-enduro          # this folder

git init
git add .
git commit -m "Budget Enduro site v2"

# create the repo on github.com first, then:
git remote add origin git@github.com:YOURNAME/budget-enduro.git
git branch -M main
git push -u origin main

npx vercel                # preview build, answer the prompts below
npx vercel --prod         # promote it
```

### Answers to the `npx vercel` prompts

| Prompt | Answer |
| --- | --- |
| Set up and deploy? | `y` |
| Which scope? | your personal account |
| Link to existing project? | `n` |
| Project name? | `budget-enduro` |
| In which directory is your code? | `./` |
| Want to modify these settings? | `n` |

Framework detects as **Other**. That is correct — there is no build step.

## Custom domain

1. Vercel dashboard → the project → Settings → Domains
2. Add `budgetenduro.com.au` and `www.budgetenduro.com.au`
3. Vercel shows the DNS records it wants. Copy them.
4. GoDaddy → My Products → Domains → budgetenduro.com.au → DNS
5. Change **only** the `A` record for `@` and the `CNAME` for `www`.
   Leave MX and TXT records alone or you will break email to
   race@budgetenduro.com.au.
6. SSL issues automatically once DNS resolves. Ten minutes to a few hours.

Leave the GoDaddy Managed WordPress plan running for a fortnight as a rollback.

## Before cancelling WordPress

Export the news posts first — WP admin → Tools → Export → All content. Those ten
articles exist nowhere else. Once the hosting is gone, so are they.

`vercel.json` already redirects the old WordPress URLs (`/the-rules`,
`/sandown-hall-of-fame`, `/shop`, `/cart`, `/checkout`, `/events/list`,
`/event/*`) to the new pages, so anything shared to Facebook keeps working.
The dated post URLs (`/2026/04/raceworks-signs-on...`) are NOT redirected yet
because there is nowhere to send them until the news pages are rebuilt.

## What vercel.json does

- `cleanUrls` — serves `/rules` instead of `/rules.html`
- Redirects from the old WordPress paths
- Long cache on images, shorter on CSS/JS
- `Permissions-Policy` allows the Square payment flow inside the ArgusIQ iframe
- HSTS, nosniff, referrer policy

Note: `frame-ancestors` belongs on the **ArgusIQ** side, not here. It is set by
the page being embedded, not the page doing the embedding.
