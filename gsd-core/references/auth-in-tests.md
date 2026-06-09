# Authentication in Integration & E2E Tests

How-to reference for the thing AIs struggle with: auth in tests. Read this when a test needs an authenticated user. Goal: authenticate once, reuse the session, handle roles — without re-logging-in every test.

## Core rules

1. **Authenticate once, reuse the session.** Never drive the login UI in every test.
2. **Drive the real login UI in exactly ONE test** (prove it works); **mint the session programmatically everywhere else.**
3. **One account per parallel worker** to avoid collisions.
4. **Secrets from env/CI**, never committed; gitignore the auth-state files (`.auth/`).

## Playwright — setup project + storageState (canonical)

```ts
// auth.setup.ts — runs once, persists the authenticated state
import { test as setup } from '@playwright/test';
const authFile = 'playwright/.auth/user.json';
setup('authenticate', async ({ request }) => {
  await request.post('/api/login', { form: { user: process.env.E2E_USER!, password: process.env.E2E_PASS! } });
  await request.storageState({ path: authFile });   // saves cookies + origin localStorage
});
```
```ts
// playwright.config.ts
projects: [
  { name: 'setup', testMatch: /.*\.setup\.ts/ },
  { name: 'chromium', use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' }, dependencies: ['setup'] },
]
```
Opt a test OUT of auth (e.g. the login-page test): `test.use({ storageState: { cookies: [], origins: [] } })`.

## Cypress — cy.session

```js
Cypress.Commands.add('login', (username, password) => {
  cy.session([username, password], () => {                  // array id keys the cache per credential/role
    cy.request('POST', '/api/login', { username, password })
      .then(({ body }) => window.localStorage.setItem('authToken', body.token));
  }, { validate() { cy.request('/api/whoami').its('status').should('eq', 200); },  // re-login when stale
       cacheAcrossSpecs: true });                           // log in once for the whole run
});
```

## Multi-role (RBAC) — one storageState per role

```ts
for (const role of ['admin', 'user']) {
  setup(`auth ${role}`, async ({ request }) => {
    await request.post('/api/login', { data: creds(role) });
    await request.storageState({ path: `playwright/.auth/${role}.json` });
  });
}
// pick a role per test: test.use({ storageState: 'playwright/.auth/admin.json' })
// cross-role in ONE test: open two browser contexts, one per role file
```

## JWT vs cookie/session (different injection)

| | JWT / Bearer | Cookie / session |
|---|---|---|
| **API test** | `request.newContext({ extraHTTPHeaders: { Authorization: 'Bearer '+t } })` | cookie jar / `Cookie` header |
| **Browser test** | seed `localStorage` via `addInitScript` / storageState | `context.addCookies()` / storageState |
| **CSRF** | bearer-in-header is CSRF-immune | forward a CSRF token in a custom header on mutating requests |

## Parallel-safe accounts (one per worker)

```ts
const id = test.info().parallelIndex;          // 0..workers-1
const file = `playwright/.auth/${id}.json`;    // reuse within the worker
// acquireAccount(id) returns a pre-seeded account from a pool sized >= worker count
```

## Managed providers

- **Clerk:** `clerk.signIn()` (server-side, bypasses MFA), `+clerk_test` emails, Testing Tokens for bot-detection bypass.
- **Supabase:** `POST /auth/v1/token?grant_type=password`; inject the session into `localStorage` key `sb-<projectRef>-auth-token` (supabase-js v2; v1 used `supabase.auth.token` — detect at runtime).
- **Auth.js / NextAuth:** a dev-only Credentials provider, or self-hosted Keycloak.

## Mock vs real IdP

- **Unit/integration:** mocking a 3rd-party IdP you can't seed (Auth0/Okta) is OK — but keep one real-token test (mocks skip signature validation).
- **E2E:** use a real test instance (provider dev tenant, Firebase Auth emulator, self-hosted Keycloak/FusionAuth).
- **MFA:** authenticate once and persist the session (sessions don't re-trigger MFA); generate the TOTP in setup, or `codegen --save-storage` once.

## Anti-patterns

- Logging in through the UI in every test (slow, flaky).
- Sharing one account across parallel workers (collisions).
- Committing tokens / auth-state files (gitignore `.auth/`).

*Sources: Playwright & Cypress official auth docs; Clerk/Supabase/Auth.js testing guides; OWASP CSRF. Caveats: (1) `request.storageState()` **does** capture cookies including HttpOnly — but localStorage is only captured from a real browser context/page; an API-only context has no localStorage, so a token your client JS stores in localStorage won't be in it. (2) storageState is a point-in-time session — if tokens expire during a long run, regenerate it in the setup project rather than reusing a stale file (Cypress's `validate()` handles staleness; Playwright does not, so re-run setup). Always verify the saved state actually authenticates before trusting it.*
