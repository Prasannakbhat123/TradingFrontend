# Lattice — Frontend

Institutional compute trading terminal (RFQ → quotes → orders → pipeline → dealer desk).

Companion API: [TradingBackend](https://github.com/Prasannakbhat123/TradingBackend).

## Setup

```bash
npm install
npm run dev
```

App: `http://localhost:5173` (Vite proxies `/v1` → `http://localhost:4000`).

Start the backend first. Demo password: `password123`.

| Email | Role |
|---|---|
| buyer@lattice.dev | Buyer |
| dealer@neocloud.dev | Provider dealer |
| dealer@apex.dev | Provider dealer |
| risk@lattice.dev | Risk |
| admin@lattice.dev | Admin |

See `docs/Lattice-E2E-Test-Guide.md` for walkthroughs.
