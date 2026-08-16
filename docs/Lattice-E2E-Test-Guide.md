# Lattice — End-to-End Test Guide

**App:** `http://localhost:5173`  
**API:** `http://localhost:4000`  
**Password for every demo user:** `password123`

Use **two browsers** (Chrome = buyer, Edge/incognito = dealer) for the full trade path.

---

## Page map (where to click)

All pages are in the **left sidebar** after login.


| Sidebar label   | URL            | Who can open it    | What you do there                            |
| --------------- | -------------- | ------------------ | -------------------------------------------- |
| — (login)       | `/login`       | Anyone logged out  | Sign in                                      |
| **Pipeline**    | `/pipeline`    | All roles          | See deal board (Leads → Complete)            |
| **Overview**    | `/overview`    | All roles          | Desk stats, feeds, quick actions             |
| **RFQ Desk**    | `/rfq`         | Buyer, Admin only  | Create RFQ, accept quotes                    |
| **Orders**      | `/orders`      | All roles          | Order blotter; Approve / Cancel              |
| **Portfolio**   | `/portfolio`   | All roles          | Capacity book / positions                    |
| **Market Data** | `/market-data` | All roles          | GPU Index chart                              |
| **Audit**       | `/audit`       | All roles          | Event log                                    |
| **Dealer Desk** | `/dealer`      | Dealer, Admin only | List inventory; provision / deliver / settle |


Dealers **cannot** open RFQ Desk. Buyers **cannot** open Dealer Desk. Opening the wrong URL redirects to Pipeline.

---



## 0. Start the app

```bash
# Terminal 1
cd backend
npm run seed
npm run dev

# Terminal 2
cd frontend
npm run dev
```

Then open `http://localhost:5173` — you should see the **Login** hero.

### Accounts


| Email                 | Role   | Org               |
| --------------------- | ------ | ----------------- |
| `buyer@lattice.dev`   | Buyer  | Northstar AI Labs |
| `dealer@neocloud.dev` | Dealer | NeoCloud Compute  |
| `dealer@apex.dev`     | Dealer | Apex GPU Partners |
| `risk@lattice.dev`    | Risk   | Lattice Platform  |
| `admin@lattice.dev`   | Admin  | Lattice Platform  |




### Seed inventory (quotes only match these GPU + region pairs)


| Provider | GPU      | Region  | Seed qty | Seed $/hr |
| -------- | -------- | ------- | -------- | --------- |
| NeoCloud | H100 SXM | US-EAST | 64       | 2.45      |
| NeoCloud | H200     | US-WEST | 32       | 3.10      |
| Apex     | H100 SXM | EU-WEST | 48       | 2.65      |
| Apex     | A100     | US-EAST | 80       | 1.35      |
| Apex     | B200     | US-EAST | 16       | 4.20      |




### How to spot *your* rows vs seed

Seed uses **12-month** deals and qtys **512, 256, 128, 80, 64, 48, 32, 16**.  
You always type **different lots** (12, 7, 36, …).

---



## 1. Login + shell

**Page:** Login → `http://localhost:5173/login`


| #    | On this page           | Do this                                                     | Expect                                                                |
| ---- | ---------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------- |
| 1.1  | Login                  | Open the URL                                                | Hero, orange ribbons, “Enter terminal”                                |
| 1.2  | Login (top-right)      | Click the **sun/moon**                                      | Theme flips; refresh keeps it                                         |
| 1.3  | Login                  | Click **Enter terminal** or **Login**                       | Email / password form appears                                         |
| 1.4  | Login form             | Email `buyer@lattice.dev` · password `password123` · submit | Redirect to **Pipeline** (`/pipeline`)                                |
| 1.5  | Any inner page         | Scroll the **right** pane                                   | Sidebar stays put; ribbons stay fixed                                 |
| 1.6  | Sidebar (buyer)        | Look at nav                                                 | **RFQ Desk** visible · **Dealer Desk** hidden                         |
| 1.7  | Pipeline (top-right)   | Click **Sign out** (sidebar bottom)                         | Back to Login                                                         |
| 1.8  | Login                  | Sign in as `dealer@neocloud.dev`                            | Lands on **Pipeline**; sidebar shows **Dealer Desk**, no **RFQ Desk** |
| 1.9  | Browser URL            | Type `/rfq` as dealer                                       | Bounce back to **Pipeline**                                           |
| 1.10 | Sign out → buyer login | Type `/dealer`                                              | Bounce back to **Pipeline**                                           |


---



## 2. Buyer — look around

**Login as:** `buyer@lattice.dev`

### 2.1 Pipeline

**Go to:** sidebar **Pipeline** · URL `/pipeline`


| #     | Where on the page | Do this            | Expect                                                                     |
| ----- | ----------------- | ------------------ | -------------------------------------------------------------------------- |
| 2.1.1 | Whole board       | Just look          | Six columns: Leads, Negotiating, Agreed, Out for signing, Signed, Complete |
| 2.1.2 | Cards             | Look at seed deals | BUY badges, codenames, GPU, $/hr — qtys like 512 / 64 / 16 (seed)          |
| 2.1.3 | Top-right         | Click **Export**   | JSON file downloads                                                        |
| 2.1.4 | Top-right         | Click **New**      | Opens **RFQ Desk** (`/rfq`)                                                |
| 2.1.5 | Empty columns     | Look               | “No deals here”                                                            |




### 2.2 Overview

**Go to:** sidebar **Overview** · URL `/overview`


| #     | Where on the page              | Do this                 | Expect                         |
| ----- | ------------------------------ | ----------------------- | ------------------------------ |
| 2.2.1 | Top                            | Read heading            | “Welcome, Alex” + 4 stat cards |
| 2.2.2 | Middle                         | Pipeline strip          | Stage counts                   |
| 2.2.3 | Left column                    | Live feeds              | Ornn / Kalshi / etc. ok or off |
| 2.2.4 | Right column **Quick actions** | Click **Create RFQ**    | Goes to **RFQ Desk**           |
| 2.2.5 | Same                           | Click **Open pipeline** | Goes to **Pipeline**           |
| 2.2.6 | Same                           | Click **Market data**   | Goes to **Market Data**        |
| 2.2.7 | Same                           | Click **Capacity book** | Goes to **Portfolio**          |


---



## 3. Core path — create RFQ, accept, check blotter

**Login as:** `buyer@lattice.dev` (Chrome)

### 3.1 Create and accept (golden path)

**Go to:** sidebar **RFQ Desk** · URL `/rfq`

**Where to type:** left card titled **New RFQ** (not the right-hand quote list).


| Field on **New RFQ** | Click / type              |
| -------------------- | ------------------------- |
| GPU type chips       | **H100**                  |
| Region chips         | **US-EAST**               |
| Quantity             | **12**                    |
| Max $/GPU-hr         | **3.99**                  |
| Duration chips       | **3 mo** (or type `2160`) |
| All-or-none          | leave **off**             |
| Manual approval      | leave **off**             |


Max notional on that card should show about **$103,421**.


| #     | Page                       | Where                        | Do this                            | Expect                                                              |
| ----- | -------------------------- | ---------------------------- | ---------------------------------- | ------------------------------------------------------------------- |
| 3.1.1 | **RFQ Desk** `/rfq`        | Bottom of New RFQ            | Click **Request quotes**           | Message: ranked quotes returned                                     |
| 3.1.2 | **RFQ Desk**               | Right side **Ranked quotes** | Look at #1                         | NeoCloud ~$2.45/hr, **qty 12**                                      |
| 3.1.3 | **RFQ Desk**               | Top-right stats              | Look                               | Ornn / Cloud min / This RFQ count                                   |
| 3.1.4 | **RFQ Desk**               | Quote card #1, bottom-right  | Click **Accept quote**             | “Order filled & allocated” + ACCEPTED                               |
| 3.1.5 | **Orders** `/orders`       | Table                        | Find the new row                   | Status **filled**, H100, **qty 12** (ignore seed 64 / 80 / 32 / 16) |
| 3.1.6 | **Portfolio** `/portfolio` | Positions list               | Find **×12** H100 NeoCloud US-EAST | New position; totals up by 12                                       |
| 3.1.7 | **Pipeline** `/pipeline`   | **Agreed** column            | Find card **12 GPUs**              | New deal (not the seed 64 GPU card)                                 |
| 3.1.8 | **Overview** `/overview`   | Stat cards                   | Look at GPU qty / value            | Numbers higher than before the RFQ                                  |




### 3.2 Optional extra RFQs (same page: **RFQ Desk**)

Stay on `/rfq`. Fill **New RFQ** again. Each lot is unused in seed.

**Apex A100**


| Field    | Value    |
| -------- | -------- |
| GPU      | A100     |
| Region   | US-EAST  |
| Quantity | **40**   |
| Max $/hr | **2.10** |
| Duration | **1 wk** |


Expect Apex ~$1.35. Spot later as **qty 40** on **Orders** / **Pipeline**.

**NeoCloud H200**


| Field    | Value    |
| -------- | -------- |
| GPU      | H200     |
| Region   | US-WEST  |
| Quantity | **24**   |
| Max $/hr | **4.75** |
| Duration | **3 mo** |


Expect ~$3.10. Spot as **qty 24**.

**Apex H100 EU**


| Field    | Value    |
| -------- | -------- |
| GPU      | H100     |
| Region   | EU-WEST  |
| Quantity | **20**   |
| Max $/hr | **3.33** |
| Duration | **1 mo** |


Expect ~$2.65. Spot as **qty 20**.

**Should fail (0 quotes)** — still on **RFQ Desk**


| Field    | Value    |
| -------- | -------- |
| GPU      | H100     |
| Region   | **APAC** |
| Quantity | **9**    |
| Max $/hr | **0.77** |


Expect empty **Ranked quotes**.

---



## 4. Manual approval

**Login as:** `buyer@lattice.dev`

**Go to:** sidebar **RFQ Desk** · `/rfq` · left **New RFQ**


| Field           | Value           |
| --------------- | --------------- |
| GPU             | H100            |
| Region          | US-EAST         |
| Quantity        | **7**           |
| Max $/hr        | **3.88**        |
| Duration        | **1 wk**        |
| Manual approval | click it **On** |



| #   | Page                       | Where                | Do this                                  | Expect                                   |
| --- | -------------------------- | -------------------- | ---------------------------------------- | ---------------------------------------- |
| 4.1 | **RFQ Desk**               | New RFQ              | **Request quotes** then **Accept quote** | Pending / manual-approval message        |
| 4.2 | **Orders** `/orders`       | Table                | Find **qty 7**                           | Status **pending_approval** (not filled) |
| 4.3 | **Orders**                 | Same row, right side | Click **Approve** if shown               | Moves toward open / filled               |
| 4.4 | **Portfolio** `/portfolio` | List                 | After fill                               | **×7** appears                           |
| 4.5 | **Pipeline** `/pipeline`   | Agreed               | After fill                               | Card with **7 GPUs**                     |


---



## 5. Dealer — list inventory and move the **12×** deal

**Login as:** `dealer@neocloud.dev` in the **second browser**  
(Keep buyer logged in on the first.)

### 5.1 Role check

**Go to:** sidebar **Pipeline** · `/pipeline`


| #     | Page         | Where     | Do this              | Expect                                     |
| ----- | ------------ | --------- | -------------------- | ------------------------------------------ |
| 5.1.1 | Any          | Sidebar   | Look                 | **Dealer Desk** yes · **RFQ Desk** no      |
| 5.1.2 | **Pipeline** | Top-right | Look at amber button | Label is **Inventory** (not **New**)       |
| 5.1.3 | **Pipeline** | Top-right | Click **Inventory**  | Opens **Dealer Desk** `/dealer`            |
| 5.1.4 | **Pipeline** | Cards     | Look                 | SELL badges where it is this dealer’s book |




### 5.2 Publish extra inventory (optional)

**Go to:** sidebar **Dealer Desk** · `/dealer`  
**Where:** left card **Publish inventory** (not the allocations list)

Do not copy seed (64 @ $2.45).


|              |             |
| ------------ | ----------- |
|              |             |
|              |             |
|              |             |
|              |             |
| Field        | Type this   |
| GPU type     | **H100**    |
| Region       | **US-EAST** |
| Quantity     | **36**      |
| $/GPU-hr     | **2.19**    |
| Topology     | `4x NVLink` |
| Interconnect | `PCIe`      |
|              |             |
|              |             |


Click **Publish inventory** (bottom of that card). Toast should say **36× H100 @ $2.19**.

Other unused recipes (same form):


| GPU  | Region  | Qty    | $/hr     |
| ---- | ------- | ------ | -------- |
| A100 | US-EAST | **11** | **1.11** |
| H100 | EU-WEST | **22** | **2.88** |
| B200 | US-EAST | **5**  | **3.75** |




### 5.3 Provision the buyer’s **12×** fill (required)

Do this **after** §3.1 (buyer accepted qty 12).

**Go to:** sidebar **Dealer Desk** · `/dealer`  
**Where:** right card **Allocations**  
**Filter:** click **Actionable** (top-right of that card)

Seed already has **64× H100 Allocated**. **Ignore that.** Find the card with **12 GPU**.


| #     | Page                        | Where                            | Do this                                        | Expect                               |
| ----- | --------------------------- | -------------------------------- | ---------------------------------------------- | ------------------------------------ |
| 5.3.1 | **Dealer Desk**             | Allocations, qty **12** card     | Confirm it says **Allocated**                  | Not the 64× seed card                |
| 5.3.2 | Same card                   | Bottom                           | Click **Start provisioning**                   | Dialog opens                         |
| 5.3.3 | Dialog                      |                                  | Click **Start provisioning** again             | Toast; pill becomes **Provisioning** |
| 5.3.4 | Switch to **buyer** browser | Sidebar **Pipeline** `/pipeline` | Look at **Out for signing**                    | **12 GPU** card moved here           |
| 5.3.5 | Back to **Dealer Desk**     | Same 12× card                    | Click **Confirm delivery** → confirm in dialog | Toast; pill **Delivered**            |
| 5.3.6 | Buyer **Pipeline**          | **Signed** column                | Look                                           | **12 GPU** card                      |
| 5.3.7 | **Dealer Desk**             | Same card                        | Click **Close settlement** → confirm           | Toast; pill **Settled**              |
| 5.3.8 | Buyer **Pipeline**          | **Complete** column              | Look                                           | **12 GPU** card                      |
| 5.3.9 | **Dealer Desk**             | Settled 12× card                 | Look at buttons                                | “No further actions”                 |


---



## 6. Full story (copy this and tick)


| Step | Browser | Page (sidebar)       | URL          | Action                                                                  | Your tell                    |
| ---- | ------- | -------------------- | ------------ | ----------------------------------------------------------------------- | ---------------------------- |
| 1    | Buyer   | Login                | `/login`     | Sign in `buyer@lattice.dev`                                             | Lands on Pipeline            |
| 2    | Buyer   | **Pipeline**         | `/pipeline`  | Note column counts                                                      | Seed cards only              |
| 3    | Buyer   | **RFQ Desk**         | `/rfq`       | New RFQ: H100, US-EAST, **12**, **3.99**, **3 mo** → **Request quotes** | Quotes on the right          |
| 4    | Buyer   | **RFQ Desk**         | `/rfq`       | **Accept quote** on #1                                                  | ACCEPTED                     |
| 5    | Buyer   | **Orders**           | `/orders`    | Find qty **12**                                                         | filled                       |
| 6    | Buyer   | **Portfolio**        | `/portfolio` | Find ×**12** H100                                                       | New position                 |
| 7    | Buyer   | **Pipeline**         | `/pipeline`  | **Agreed** column                                                       | 12 GPU card                  |
| 8    | Dealer  | Login                | `/login`     | `dealer@neocloud.dev`                                                   | Dealer nav                   |
| 9    | Dealer  | **Dealer Desk**      | `/dealer`    | Allocations → **Actionable** → card **12 GPU**                          | Allocated                    |
| 10   | Dealer  | **Dealer Desk**      | `/dealer`    | **Start provisioning** + confirm                                        | Provisioning                 |
| 11   | Buyer   | **Pipeline**         | `/pipeline`  | **Out for signing**                                                     | 12 GPU                       |
| 12   | Dealer  | **Dealer Desk**      | `/dealer`    | **Confirm delivery** + confirm                                          | Delivered                    |
| 13   | Buyer   | **Pipeline**         | `/pipeline`  | **Signed**                                                              | 12 GPU                       |
| 14   | Dealer  | **Dealer Desk**      | `/dealer`    | **Close settlement** + confirm                                          | Settled                      |
| 15   | Buyer   | **Pipeline**         | `/pipeline`  | **Complete**                                                            | 12 GPU                       |
| 16   | Risk    | Login then **Audit** | `/audit`     | Scroll events                                                           | `rfq.create`, `settlement.`* |


---



## 7. Market Data

**Login as:** any user  
**Go to:** sidebar **Market Data** · `/market-data`


| #   | Where on the page         | Do this                         | Expect                        |
| --- | ------------------------- | ------------------------------- | ----------------------------- |
| 7.1 | Title                     | Look                            | **GPU Index**                 |
| 7.2 | Left **Instruments** list | Check **H100**                  | Chart on the right draws $/hr |
| 7.3 | Same list                 | Check a second GPU              | Two series overlay            |
| 7.4 | Chart header              | Click **7D** / **30D** / **3M** | Chart redraws                 |
| 7.5 | Same                      | Try **1Y** / **YTD**            | Locked                        |
| 7.6 | Top tabs                  | All / Hyperscaler / Neocloud    | List filters                  |
| 7.7 | Top-right (admin only)    | **Refresh**                     | Feeds update, no crash        |


---



## 8. Risk and Admin



### Risk

**Login as:** `risk@lattice.dev`  
**Go to:** sidebar **Audit** · `/audit`


| #   | Do this              | Expect                                                            |
| --- | -------------------- | ----------------------------------------------------------------- |
| 8.1 | Read the table       | Actor, action, entity, time                                       |
| 8.2 | After the full story | New `rfq.create` / `settlement.provisioning` / `settlement.close` |




### Admin

**Login as:** `admin@lattice.dev`


| #   | Page                           | Do this                               | Expect       |
| --- | ------------------------------ | ------------------------------------- | ------------ |
| 8.3 | Sidebar                        | Open **RFQ Desk** and **Dealer Desk** | Both allowed |
| 8.4 | **Market Data** `/market-data` | Click **Refresh**                     | Feeds ok     |


---



## 9. What each page should show after the golden RFQ



### Orders — `/orders` (buyer)

Find the row with **qty 12** (not 64 / 16 / 32 / 80).


| Column | Value        |
| ------ | ------------ |
| Type   | `rfq_accept` |
| Status | `filled`     |
| GPU    | H100 SXM     |
| Qty    | 12           |
| Region | US-EAST      |




### Portfolio — `/portfolio` (buyer)


| Check           | Value                            |
| --------------- | -------------------------------- |
| New position    | H100 × **12**, NeoCloud, US-EAST |
| Summary GPU qty | Up by 12 vs before the RFQ       |




### Pipeline — `/pipeline` (buyer)

Follow the **12 GPU** card only:


| After this action          | Column              |
| -------------------------- | ------------------- |
| Accept quote               | **Agreed**          |
| Dealer starts provisioning | **Out for signing** |
| Dealer confirms delivery   | **Signed**          |
| Dealer closes settlement   | **Complete**        |


---



## 10. Pass / fail


| Area                  | Pages used                                | Pass? |
| --------------------- | ----------------------------------------- | ----- |
| Login / theme / roles | `/login`, sidebar                         | ☐     |
| Pipeline / Overview   | `/pipeline`, `/overview`                  | ☐     |
| RFQ → accept          | `/rfq`                                    | ☐     |
| Fill visible          | `/orders`, `/portfolio`, `/pipeline`      | ☐     |
| Manual approval       | `/rfq` then `/orders`                     | ☐     |
| Dealer inventory      | `/dealer` left form                       | ☐     |
| Provision → settle    | `/dealer` allocations + buyer `/pipeline` | ☐     |
| GPU Index             | `/market-data`                            | ☐     |
| Audit                 | `/audit`                                  | ☐     |


**Tester:** _______________ **Date:** _______________

---



## 11. If something fails


| What you see          | Page you were on    | Fix                                                                                        |
| --------------------- | ------------------- | ------------------------------------------------------------------------------------------ |
| No quotes             | **RFQ Desk**        | GPU + region must match seed inventory; max $/hr ≥ book price                              |
| Empty board           | **Pipeline**        | Run `npm run seed` in backend                                                              |
| Can’t start provision | **Dealer Desk**     | You clicked the seed **64×** card, or it’s already past Allocated — use **12×** after §3.1 |
| 403 / bounce          | `/rfq` or `/dealer` | Wrong role; use buyer vs dealer account                                                    |
| Network error         | Any                 | Backend must be running on `:4000`                                                         |


---



## 12. Cheat sheet (print this)

```
BUYER  →  RFQ Desk (/rfq)  →  New RFQ (left)
         H100 · US-EAST · 12 · 3.99 · 3 mo
         Request quotes  →  Accept #1

THEN    →  Orders (/orders)     look for qty 12 filled
        →  Portfolio (/portfolio)  ×12 H100
        →  Pipeline (/pipeline)    Agreed column, 12 GPUs

DEALER →  Dealer Desk (/dealer)  →  Allocations (right)  →  Actionable
         Card = 12 GPU  (NOT 64)
         Start provisioning → Confirm delivery → Close settlement

BUYER  →  Pipeline: Out for signing → Signed → Complete
```

---

*End of Lattice E2E Test Guide*