<img width="1672" height="941" alt="Image" src="https://github.com/user-attachments/assets/b5cca213-15ab-4563-bc11-5ec1b3d1ed9d" />

# Holiday Inventory Cash-Gap Calculator

Moonshine Capital / Distilled Funding · dependency-free inventory cash-flow calculator and Wix embed.

**Status:** GitHub/Vercel-ready local package. Not yet pushed, deployed, or installed in Wix. Financial unit tests pass; actual browser/iframe visual QA and live CTA click-through need final operator verification.

## What you get

- `index.html` — full standalone SEO-friendly application, methodology, FAQ, print report.
- `embed.html` — compact identical calculator, with 940×1200 iframe and mobile tab layout.
- `assets/calculator.js` — **the one and only** financial engine shared by both entry points.
- `assets/app.js` — common UI, SVG chart, scenario states, CSV, clipboard and print actions.
- `assets/styles.css` — responsive design and print styles, no CDN.
- `assets/config.js` — **only** commercial URLs, attribution settings and verified canonical URL. The model never imports it.
- `embed-snippet.html` — replacement-required Vercel URL placeholders and Wix iframe example.
- `tests/calculator.test.js` — core assertions, including financing-induced future shortfalls.
- `scripts/server.js` — simple static server, no npm packages.
- `vercel.json` — static Vercel setup and simple security headers.
- `QA_REPORT.md` — acceptance checklist and honest verification boundaries.

## Local setup (Node 18+)

```bash
unzip holiday-inventory-cash-gap-calculator.zip
cd holiday-inventory-cash-gap-calculator
npm test
npm run dev
```

Open `http://localhost:4173/` for the full app and `http://localhost:4173/embed.html` for the Wix version. No `npm install` or credentials are necessary; there are **zero third-party runtime dependencies**.

To use a different port:

```bash
PORT=3000 npm run dev
```

The files can also be served by any standard static server. **Do not** open them with a `file://` URL: browser module imports normally require HTTP(S).

## Financial methodology

This is a **cash-timing model**, not an underwriting or loan pricing system.

All model money is rounded to integer cents at each transaction boundary before being placed on the ledger. Dates are YYYY-MM-DD in a timezone-independent UTC day convention; transactions on the same date net settle by the end of that day. The longest analysis period is 366 days.

### Inventory, sales and profit

```
new_purchase_cost = (planned_new_units × unit_cost) OR user-entered_total_purchase_cost
inventory_cash_commitment = new_purchase_cost + inbound_freight
available_units = planned_new_units + existing_units
units_sold = floor(available_units × sell_through_percent / 100)
gross_sales = units_sold × retail_unit_price
returns_allowance = gross_sales × returns_percent / 100
net_expected_collections = gross_sales − returns_allowance
platform_fees = gross_sales × platform_fee_percent / 100
fulfillment_cost = units_sold × fulfillment_cost_per_unit
other_variable = units_sold × other_variable_cost_per_unit
```

Estimated COGS uses a simplified existing-stock-first cost allocation: sold preexisting units at the existing stock's entered cost basis; then new purchased units at the effective purchase cost per unit. Inbound freight is allocated to *new units sold*, not all units ordered. Existing stock value is a historical cost basis for profit reporting and **does not** cause another cash outflow.

```
gross_profit = net_expected_collections − allocated_sold_inventory_COGS − allocated_sold_freight_COGS
contribution = gross_profit − platform_fees − fulfillment_cost − other_variable − marketing_spend
```

Other operating expenses/overhead are placed in the **cash ledger** but are excluded from contribution (not necessarily a variable cost). Marketing expense is included in contribution. This distinction is intentional.

Sales gross inflow, returns allowance and processing fees are posted on the payout/collection date. Fulfillment, freight, marketing and other operating spending happen on separately specified cash dates. Refunds are simplified as a reduction of the modeled payout on that date, not a second later refund schedule.

### Cash timeline and gap

```
supplier_deposit = new_purchase_cost × deposit_percent / 100
supplier_balance = new_purchase_cost − supplier_deposit
cash_without_finance[t] = starting_cash + sum(all non-financing dated cash transactions through t)
cash_with_finance[t] = cash_without_finance[t] + sum(all financing proceeds and repayments through t)
base_cash_gap = max(0, -min_t cash_without_finance[t])
financed_cash_gap = max(0, -min_t cash_with_finance[t])
positive_cushion = max(0, min_t cash_without_finance[t])
```

The **cash gap** is the *deepest projected deficit*, not `inventory cost − available cash`. Borrowing is neither revenue nor margin; repaid principal is neither COGS nor operating expense. Financing is modeled as a hypothetical advance on a specific date and equal scheduled principal-plus-fee repayments. The **flat financing fee** is `advance × user_fee_percent / 100`, and is **not APR**. Final installment absorbs cents remainder so the repayments always reconcile to principal + flat fee.

Transactions outside the analysis window are omitted from the ending balance and the user is warned where material. When payment schedules continue beyond the analysis window, financed cash may appear higher than its eventual position. Extend the window.

### Sales cash-spend recovery threshold

```
net_cash_per_sold_unit = price × (1 − refund% − platform_fee%)
                         − fulfillment_cost_per_unit − other_variable_per_unit
cash_spend_to_recover = new_purchase_cost + freight + marketing_spend + other_operating_spend
units_to_recover = ceil(cash_spend_to_recover / net_cash_per_sold_unit)
required_sell_through = units_to_recover / available_units × 100
```

Only calculated if `net_cash_per_sold_unit > 0`. This is a simplified **sales cash-spend recovery**, **not** a break-even cash *timing* requirement, funding need, accounting break-even or profit threshold. Existing stock is already paid for. The threshold excludes starting cash, unrelated additional inflows, financing flows and calendar timing; it can exceed 100%.

### Sensitivities / scenarios

The forecasts are simple **illustrative parameter changes**, not predictions:

| Scenario | Sell-through adjustment | Payout timing |
|---|---:|---:|
| Conservative | –20 percentage points | +14 calendar days |
| Base | As entered | As entered |
| Optimistic | +12 percentage points | –7 calendar days |

Sell-through is clamped between 0–100%. Cases are independent and recalculate from the same inputs. If the shifted payout moves out of range, sales revenue is **not counted in the window's cash balance** and the warning is visible.

### Modeling limits

Single inventory purchase/season and single average selling price; a single gross customer-payout date; one lump estimated returns allowance; same-day settlement for identical-date events; simple unit sell-through and existing-stock-first allocation; no inventory holding costs, tax/VAT/sales tax, payout holds, credit facility revolvers, daily remittance advances, compound interest, refinancing, revenue recognition timing or real creditor agreements. Not a bank statement, lender quote or promise of funding.

## Conversion and privacy

The `https://www.distilledfunding.com/apply` page was publicly verified as an active Moonshine Capital funding intake page on October 29, 2026 and is enabled as the primary CTA. Its exact loan application behavior beyond publicly visible form content has **not** been tested by submitting anything.

The requested Tally candidate `https://tally.so/r/mOe658` was **not verifiable** and is intentionally **disabled**, not falsely linked. `assets/config.js` has `secondary: null`, `affiliateOffers: []`, and `emailResultsEndpoint: null`.

**No email results form or submission is presented**: configuring one would require a consented, already-approved receiving endpoint. When added, it must opt in explicitly, validate origins, handle privacy terms and avoid silently transmitting the model. Do not add a fake 'Email my results' action. All user-entered financial data stays in browser memory until the user chooses to print, download CSV or copy text. No localStorage or third-party analytics is used. A standalone share link is just the page URL without user inputs.

`config.js` also reserves tool/source/campaign and UTM fields for later allowed source attribution. Do not attach sensitive financial inputs to links or analytics. Add an obvious affiliate disclosure if a verified affiliate offer is added in the future.

## Deploy to Vercel (separate authorization required)

1. Unpack and inspect these files. Use a new static repo for this tool **or** add it as an independent static route to `Embed-Widgets` after evaluating the widget SDK. Do not replace the existing `Embed-Widgets` React/Vite project.
2. Commit the contents to GitHub only when authorized.
3. Import the repository in Vercel. Set **Framework Preset: Other**, **Root Directory: `/`**, **Build Command: empty/None**, **Output Directory: `.`** (project root). Static HTML and JS require no build step or environment variables. The `package.json` is for local commands and tests, not a production build.
4. After deployment, verify both `https://<your-actual-host>/` and `https://<your-actual-host>/embed.html` load. Use the actual verified host, not a guessed domain.
5. Set `canonicalUrl` in `assets/config.js` to the **verified production landing URL**. `app.js` adds rel=canonical and `og:url` only when set. The embed is permanently `noindex,follow` to avoid competing with the standalone page. If previews must be noindexed too, configure project-level preview controls.
6. Use the `embed-snippet.html` markup after replacing both placeholder URLs with the actual deployed URL. Never paste the placeholder into production.
7. Independently validate links, privacy disclosures and potential affiliate destinations.

**Wix instructions:** In the Wix article editor, add an HTML iframe/embed element; paste the snippet or use the HTML embed URL feature. Set the **containing Wix element** to 940×1200 px (or narrower) and ensure the parent page doesn't crop or place a sticky overlay over the widget. The code itself cannot resize a Wix parent iframe. On narrower screens, the calculator shows Inputs/Results toggles to keep the experience compact. The embed deliberately hides the long methodology/FAQ and the full 10-metric section; the standalone version exposes them.

The iframe uses `sandbox` permissions to allow client-side JS, links, downloads, clipboard UI where supported, and print. If Wix applies another sandbox, inspect its effective permissions before expecting download/print behavior. No `postMessage` sizing is used; neither document can silently enlarge the parent beyond 1200px.

## SEO and companion content

Current standalone title: **Inventory Cash Flow Calculator | Holiday Cash-Gap Planner — Moonshine Capital**.

Current meta description: **Free inventory cash flow calculator for ecommerce sellers. Model supplier deposits, delayed payouts, seasonal expenses and hypothetical financing to see your real cash gap.**

Semantic H1 is “Can you afford to stock up for the holiday rush?”. The standalone page includes direct explanations of liquidity, profit and financing scenarios plus 5 FAQs, OG and X meta tags and accurate `WebApplication` schema. Keep the standalone canonical unique, and link to the widget from relevant **existing** Wix articles rather than publishing duplicate SEO articles. Existing Distilled Funding site already has ecommerce services and general business-funding pages.

## Testing and acceptance

```bash
npm test
```

The built-in Node test suite is deterministic, dependency-free and covers 18 named cases. **QA_REPORT.md** contains the verified automated result, any environment blockers and a browser QA checklist for 940×1200, 768px and mobile.

## External systems

GitHub repository inspection and public Wix URL research were read-only. **No** GitHub, Vercel, Wix, CRM or Notion records were created, edited or deployed during packaging.
