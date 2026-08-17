# Lattice — Frontend

Institutional compute trading terminal (RFQ → quotes → orders → pipeline → dealer desk).

Companion API: [TradingBackend](https://github.com/Prasannakbhat123/TradingBackend).

## Setup

```bash
npm install
npm run dev
```

App: `http://localhost:5173` (Vite proxies `/v1` → `http://localhost:4000`).

Leave `VITE_API_URL` empty for local backend on port 4000

Start the backend first. Demo password: `password123`.

| Email | Role |
|---|---|
| buyer@lattice.dev | Buyer |
| dealer@neocloud.dev | Provider dealer |
| dealer@apex.dev | Provider dealer |
| risk@lattice.dev | Risk |
| admin@lattice.dev | Admin |

## Vercel

Framework preset: **Vite**. Root: repo root. `vercel.json` rewrites client routes to `index.html` so refresh on `/pipeline` (etc.) does not 404.

**Environment variable (required for production):**

| Name | Value |
|---|---|
| `VITE_API_URL` | Render URL, no trailing slash, e.g. `https://lattice-xxxx.onrender.com` |

Set it for Production and Preview, then **redeploy**. Vite inlines this at build time.

See `docs/Lattice-E2E-Test-Guide.md` for walkthroughs.
