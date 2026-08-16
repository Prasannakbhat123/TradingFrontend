# Lattice — Phase 1 Product Plan

**Document type:** Product & delivery proposal  
**Status:** Planning / pre-build  
**Product working name:** Lattice (Compute Terminal)  
**Audience:** Stakeholders requesting institutional compute trading capability  

---

## 1. Executive summary

Lattice is proposed as an **institutional compute trading terminal** for buying and selling GPU capacity. The goal is to give trading desks a single place to:

- Discover and price GPU compute against live market references  
- Run a structured **RFQ → quote → order → allocation → settlement** workflow  
- Track a deal **pipeline** from lead through completion  
- Overlay **live market data** (GPU indexes, cloud prices, event markets, macro/energy)  
- Operate under **role-based access** (buyer, provider dealer, risk, admin)  

This document describes the **Phase 1 scope**, planned features, included data sources, recommended stack, and end-to-end user flows. It is intended as alignment before engineering kickoff.

---

## 2. Problem & opportunity

GPU capacity is increasingly traded like a commodity, but desks still stitch together:

- Spreadsheets and chat for RFQs  
- Fragmented cloud/neocloud price pages  
- Separate settlement / capacity tracking  
- No shared “tape” or index context for negotiation  

Lattice would position itself as **financial infrastructure for compute traders** — connectivity, execution, and market data in one terminal experience.

---

## 3. Product principles

| Principle | Intent |
|---|---|
| Terminal-first UX | Dense, professional dark/light trading UI — not a generic SaaS dashboard |
| Workflow clarity | Clear stages from RFQ to settled capacity |
| Live context | Quotes and decisions informed by indexes and overlays |
| Role separation | Buyers, dealers, risk, and admin see the right tools |
| Graceful degrade | Core trading works even if optional market feeds are offline |
| Auditability | Immutable event history for key actions |

---

## 4. Personas & roles

| Role | Who | Primary jobs in Lattice |
|---|---|---|
| **Buyer** | AI lab / trading desk procuring GPUs | Create RFQs, compare quotes, accept deals, track pipeline & portfolio |
| **Provider dealer** | Neocloud / capacity seller | Respond to RFQs, manage inventory, confirm delivery, settle |
| **Risk** | Internal risk / ops | Review audit trail, monitor exposures and alerts |
| **Admin** | Platform operator | Org oversight, feed refresh, configuration |

Authentication (proposed): email/password + JWT, org membership, role-based access control. SSO can be deferred past Phase 1.

---

## 5. Phase 1 feature scope

### 5.1 Terminal shell

- Secure login  
- Persistent left navigation, fixed sidebar; scrollable workspace  
- Light / dark theme toggle (persisted preference)  
- Custom scrollbars and polished motion for a modern terminal feel  
- Live-feeds status indicator in the header  

### 5.2 Deal Pipeline (Kanban)

A board-style view of the compute deal lifecycle:

| Column | Meaning |
|---|---|
| **Leads** | New / open RFQs without active negotiation |
| **Negotiating** | Quoted RFQs or pending orders |
| **Agreed** | Filled orders / allocated capacity |
| **Out for signing** | Provisioning in progress |
| **Signed** | Delivered allocations |
| **Complete** | Settled deals |

Each deal card would show side (BUY/SELL), codename, GPU type, quantity/nodes, duration, total notional, $/GPU-hr, engagement hints, and assignee. Column totals and export would be included. Pipeline would be the default home for trading users.

### 5.3 Overview (desk home)

A role-aware command center with:

- Portfolio stats (GPU qty, avg $/GPU-hr, contracted value, pipeline deal count)  
- Pipeline stage snapshot  
- Live feed health  
- Compute tape highlights  
- Recent order activity  
- Quick actions (Create RFQ, Pipeline, Market Data, Capacity book)  
- Provider concentration and expiry alerts  

### 5.4 RFQ Desk (buyers)

- Create RFQs: GPU type/model, quantity, region, start, duration, max price, instructions (best price, all-or-none, preferred providers, manual approval)  
- Route to approved provider inventory  
- Receive ranked quotes  
- Accept a quote to create an order / execution path  

### 5.5 Orders & OMS

- Order types: RFQ accept, limit, manual approval  
- Statuses: pending approval → open → partially filled / filled / cancelled / rejected  
- Pre-trade checks against org limits  
- Execution records when fills occur  

### 5.6 Portfolio & settlement

- **Capacity book:** positions by GPU, provider, region, price, expiry  
- **Allocations:** allocated → provisioning → delivered → exception → settled  
- Dealer confirmation of delivery  
- Settlement open/close with amount and notes  
- Expiry alerts for near-term capacity  

### 5.7 Dealer Desk (providers)

- View inbound RFQs / quotes for their org  
- Publish and maintain inventory (GPU type, qty, region, topology, interconnect, price, SLA)  
- Advance provisioning and close settlements  

### 5.8 Market Data — GPU Index

Institutional-style market data experience inspired by GPU index products:

- Instrument picker (A100 / H100 / H200 / B200 / etc.) with tickers, latest $/hr, change  
- Segment filters: All / Hyperscaler / Neocloud  
- Interactive price ($/hr) time-series chart  
- Time ranges: 7D / 30D / 3M (longer ranges can be gated for a later “full history” plan)  
- Multi-select overlay of instruments  
- Feed health chips for connected sources  

### 5.9 Compute Tape & benchmarks

Internal “Lattice tape” capturing trade/quote-derived benchmarks (median, p90, latest) alongside external indexes for RFQ context.

### 5.10 Audit

Immutable audit log of key actions (login-sensitive ops, inventory create, order accept, settlement close, etc.) filterable by entity.

### 5.11 Notifications (Phase 1 light)

In-product badge / indicator for negotiating activity; deeper notification channels can follow later.

---

## 6. External markets layer (included data sources)

Phase 1 would ingest a curated set of **free / public** feeds. Each feed tags points with a `source` for the Market Data UI.

| Source | Role in Lattice | Auth | Why include |
|---|---|---|---|
| **Ornn OCPI** | GPU $/hr index (institutional reference) | Public + optional API key | Spread-to-index for RFQs |
| **GPU Cloud Prices** | Multi-provider on-demand rental board | No key | Cross-cloud H100/A100/B200 surface |
| **Kalshi** | Event-contract probabilities (macro/energy) | Public read | Hedging *signal* layer (not order routing in Phase 1) |
| **Polymarket** | Broader prediction-market events | No key for market metadata | Complements Kalshi coverage |
| **FRED** | Hard macro series (e.g. Fed funds, 10Y, CPI) | Free API key | Ground-truth rates |
| **EIA** | US electricity prices | Free API key | Datacenter OpEx / energy overlay |
| **Vast.ai** (optional) | Live GPU offers → inventory adapter | Free account API key | Southbound liquidity beyond manual dealers |

**Design rule:** missing keys skip that poller; RFQ trading remains available.

### Explicitly out of Phase 1 (deferred)

- Kalshi / Polymarket **order placement** and custody (legal/compliance gate)  
- AWS Spot / RunPod / Lambda Labs adapters (credential-heavy)  
- Paid aggregators (e.g. GPUs.io)  
- SSO / SAML  
- Full mobile-native clients  

---

## 7. Domain model (planned)

Core entities the system would persist:

- **Organization** (buyer / provider / platform) with KYB status and trading limits  
- **User** (role + org)  
- **Inventory** (dealer or feed-sourced capacity)  
- **RFQ** → **Quote** → **Order** → **Execution** → **Allocation** → **Position** → **Settlement**  
- **MarketDataPoint** (multi-source tape)  
- **AuditEvent**  

Pipeline stages would be **derived views** of RFQ / order / allocation / settlement status — not a separate disconnected CRM.

---

## 8. User flows

### 8.1 Buyer — procure capacity

```text
Login (buyer)
  → Pipeline / Overview (desk context)
  → RFQ Desk: create RFQ
  → System routes to approved providers / inventory
  → Quotes returned & ranked
  → Buyer accepts quote
  → Order created → fill / execution
  → Allocation appears on Pipeline (Agreed → …)
  → Portfolio capacity book updates
  → On delivery + settlement: moves to Complete
```

### 8.2 Dealer — sell & deliver

```text
Login (provider dealer)
  → Dealer Desk / Pipeline (SELL side)
  → Review inbound RFQs; post/update inventory
  → Quote (via routing or desk tools)
  → On fill: provision capacity
  → Confirm delivery
  → Close settlement
```

### 8.3 Market context — price discovery

```text
Login
  → Market Data (GPU Index)
  → Filter All / Hyperscaler / Neocloud
  → Select GPU instruments
  → Review $/hr series (7D / 30D / 3M)
  → Cross-check Ornn / cloud board / Lattice tape
  → Use levels when drafting RFQ max price or evaluating quotes
```

### 8.4 Risk / admin oversight

```text
Login (risk / admin)
  → Audit: review actions by entity
  → Overview / Portfolio: concentration & expiry alerts
  → Admin: refresh market feeds when needed
```

### 8.5 Theme & workspace UX

```text
Any authenticated session
  → Toggle light/dark theme (persisted)
  → Sidebar remains fixed; only main workspace scrolls
  → Navigate Pipeline, Overview, RFQ, Orders, Portfolio, Market Data, Audit
```

---

## 9. Recommended technical approach (for build phase)

| Layer | Proposal |
|---|---|
| Frontend | Vite + React + TypeScript + Tailwind; Lucide icons; Recharts for GPU Index; motion for terminal polish |
| Backend | Node.js + Express + TypeScript |
| Database | MongoDB (Atlas) via Mongoose |
| Auth | JWT + RBAC middleware |
| Realtime (optional stretch) | Socket.io for live status later |
| Ops | Env-based feed keys; seed script for demo orgs/users/inventory |

This stack keeps Phase 1 delivery fast while matching a trading-terminal UX.

---

## 10. Demo narrative (for stakeholder walkthrough after build)

Once implemented, a short demo story would be:

1. Sign in as a **buyer** desk user  
2. Land on **Pipeline** — see deals across stages  
3. Open **Overview** — portfolio + live feeds  
4. Create an **RFQ**, receive quotes, **accept**  
5. Confirm **Orders** / **Portfolio** update  
6. Open **GPU Index** — chart H100/A100 levels  
7. Sign in as **dealer** — delivery + settlement  
8. Open **Audit** — show traceability  

Demo roles would include buyer, two dealers, risk, and admin.

---

## 11. Success criteria for Phase 1

Phase 1 is successful if stakeholders can:

1. Complete a full RFQ-to-settlement path in the terminal  
2. See deals progress on a Pipeline board  
3. View live (or gracefully degraded) multi-source GPU/macro overlays  
4. Distinguish buyer vs dealer experiences by role  
5. Export / review audit-relevant activity  
6. Use light or dark theme comfortably in a fixed-sidebar layout  

---

## 12. Risks & mitigations

| Risk | Mitigation |
|---|---|
| External API downtime / key limits | Optional pollers; core RFQ path independent |
| Legal exposure on prediction-market trading | Hedging *signals* only; order routing feature-flagged off |
| Sparse historical price series early on | Seed/demo series + accumulate points over time |
| Scope creep into full CRM / SSO / mobile | Explicit Phase 1 cut-line (this document) |

---

## 13. Proposed delivery phases

| Phase | Focus |
|---|---|
| **Phase 1 (this plan)** | Auth/RBAC, RFQ–OMS–portfolio–settlement, Pipeline, Overview, GPU Index market data, feeds, audit, theme/shell |
| **Phase 2** | Richer role home screens, click-through deal drawers, longer history unlocks, more hyperscaler adapters |
| **Phase 3** | SSO, notifications, hedging workflow (post legal), advanced risk analytics |

---

## 14. Ask / decision needed

Please confirm:

1. Phase 1 scope above is approved to proceed to build  
2. Preferred brand framing remains **Lattice — Compute Terminal**  
3. Kalshi hedging stays **off** until legal clears  
4. Priority for first walkthrough: **Pipeline + RFQ path** vs **GPU Index market data**  

---

## 15. Appendix — Screen map (planned IA)

| Route / area | Purpose |
|---|---|
| Login | Authenticate |
| Pipeline | Deal Kanban (default home) |
| Overview | Desk summary & quick actions |
| RFQ Desk | Create/manage RFQs (buyers) |
| Orders | Order blotter |
| Portfolio | Capacity book & positions |
| Market Data | GPU Index + overlays |
| Audit | Event history |
| Dealer Desk | Inventory & delivery (dealers) |

---

*End of Phase 1 product plan — prepared for stakeholder review prior to implementation.*
