# Authentication Options Evaluation

**Issue:** #346 — Evaluate authentication options and determine whether
authentication is necessary for the project.

**Status:** Assessment / recommendation. No code change is proposed by this
document on its own.

## TL;DR

For the application **as it is built today**, user authentication is **not
necessary** and would add cost and complexity without protecting anything. The
app is a purely static, client-side editor with no backend and no shared stored
data, so there is no protected resource for authentication to guard.

Authentication only becomes relevant **if and when** the project adds a backend
that stores or shares data per user (for example server-side project storage,
multi-user collaboration, or feedback attributed to real accounts). This document
records that reasoning and lays out the realistic options for that future case.

## What the application is today

- **Static client-side SPA.** React + Vite, deployed to GitHub Pages. There is
  no application server and nowhere to run server-side code.
- **No backend and no server-side data.** No `server/`, `api/`, or `functions/`
  directory and no database.
- **Data lives on the user's device.** The in-progress model is kept in the
  browser's storage and persisted by saving to a local JSON file.
- **Sharing is file-/link-based, not account-based.** Models are shared by
  exporting a file or a URL/QR code that embeds the model data.
- **No existing auth dependencies.**

## Why authentication is not needed now

Authentication answers "who is this user?" so an application can decide what that
user may see or do. That question only has value when there is something to
protect: shared or server-held data, per-user state, or privileged actions.

This app has none of those:

- No server-side resource to restrict access to.
- Each user's data never leaves their own browser/device unless they export it.
- Every action is local to the user's own session.

Adding login today would mean asking users to create accounts for a tool that
stores nothing about them — friction with no security benefit. It would also
require infrastructure that GitHub Pages cannot provide, because real
authentication needs a trusted server component.

## When authentication *would* become necessary

Revisit this decision if any of the following is added:

1. **Server-side project storage** — models saved to a backend for cross-device
   access.
2. **Multi-user collaboration** — several people editing or commenting on the
   same model.
3. **Feedback or comments attributed to real identities** — e.g. #355 tied to
   accounts rather than free-text names.
4. **Any private or per-user data held centrally**, or any action that must be
   restricted to specific users.

Each of these introduces a backend and a protected resource, at which point
authentication (and authorisation) is required.

## Options for the future (when a backend is introduced)

| Option | What it is | Fit for this project | Main trade-offs |
|---|---|---|---|
| **No auth (status quo)** | Fully client-side, file-based. | Right choice until a backend with shared/per-user data exists. | No accounts, no server cost; no cross-device sync or per-user private storage. |
| **Managed auth-as-a-service** (Auth0, Clerk, Firebase Auth, Supabase Auth) | Hosted identity provider; SPA redirects to it and receives a token. | Strong fit once a backend exists — offloads password handling, MFA, social login. | Third-party dependency; free tiers have limits; still needs a backend to validate tokens. |
| **GitHub OAuth** | Sign in with GitHub. | Good if users have GitHub accounts and a lightweight backend can do the code exchange. | OAuth secret needs a server/serverless function; limits audience to GitHub users. |
| **Backend-as-a-service with built-in auth + storage** (Supabase, Firebase) | One platform for auth and data. | Efficient if the project needs both at the same time. | Platform lock-in. |
| **Self-hosted / custom auth** | Own server issuing and validating sessions/tokens. | Only if there is a strong reason to avoid third parties. | Highest build and security burden; least advisable for a small team. |

### Hosting implication

Any real authentication requires a trusted server-side component (to hold OAuth
secrets, validate tokens, serve protected data). GitHub Pages cannot do this.
Introducing auth therefore also means introducing hosting that can run
server-side code — which is why this decision is coupled to "add a backend"
rather than being a standalone feature.

## Recommendation

1. **Do not add authentication now.** It protects nothing in the current
   architecture and conflicts with the static GitHub Pages hosting model.
2. **Treat "add a backend" and "add authentication" as a single, coupled
   decision.** When a feature needs shared or per-user server-held data, bring
   authentication into that same piece of work.
3. **Prefer a managed provider** (auth-as-a-service, or a BaaS that bundles auth
   and storage) over self-hosted auth. **GitHub OAuth** is a sensible first
   identity option given the audience and hosting.
4. **Re-check this evaluation** when a backend is first planned.
