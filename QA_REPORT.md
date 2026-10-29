# QA Report — 2026-10-29

## Verified checks

| Item | Result | Evidence |
|---|---|---|
| One engine shared across both pages | PASS | `index.html` and `embed.html` both import `assets/app.js`, which imports `assets/calculator.js` |
| JavaScript syntax | PASS | `node --check` run for both engine and UI modules |
| Financial logic | PASS | `npm test` — **18 passed, 0 failed** |
| Core no-gap / positive cushion | PASS | Automated tests |
| Deposit then final supplier balance | PASS | Automated tests |
| Payout later than supplier payment | PASS | Automated tests |
| Slow sell-through and no sales | PASS | Automated tests |
| High returns / platform fee / variable costs | PASS | Automated tests |
| Existing stock cost basis without new cash expense | PASS | Automated tests |
| Unfunded versus funded cash timelines | PASS | Automated tests |
| Financing repayment creates secondary gap | PASS | Automated tests |
| Repayment beyond end flagged | PASS | Automated tests |
| Dates, amounts, rounding, CSV output | PASS | Automated tests |
| Local static server HTTP | PASS | `curl -I http://localhost:4173/embed.html` returned HTTP 200 |
| No external JS/CSS/CDN or database | PASS | Source inspection |
| Conversion configuration distinct from financial engine | PASS | `assets/config.js` only imported by `app.js` |
| Main funding page live, business intake visible | PASS (public URL only) | `https://www.distilledfunding.com/apply` visited/read 2026-10-29 |
| Tally destination appropriate | UNVERIFIED / DISABLED | Form URL inaccessible to public verification |
| Live email form | INTENTIONALLY NOT IMPLEMENTED | No authorized receiving endpoint |
| External write/deployment | NOT PERFORMED | Separate approval required |

## Browser/iframe QA still required

A Chromium headless attempt was made, but it **hung before rendering even `about:blank`** in this container, including with `--no-sandbox` and `--disable-gpu` flags. A screenshot or interactive browser test **was not completed**. The following need a working desktop/mobile browser before final production sign-off:

- [ ] Standalone at 1440×900 and 390×844: all controls, SVG, results, FAQ, actions and print report.
- [ ] Embedded at **940×1200**, **768×1200**, **390×1200** and **320×1200**. Check `document.documentElement.scrollWidth <= innerWidth` in the iframe, and inspect the bottommost control after opening each tab.
- [ ] Confirm iframe document's `scrollHeight <= 1200` at default/Inputs and Results screens; Costs and Funding tabs may require height tuning for narrow containers. If not, reduce section density or direct to standalone — **never increase the Wix iframe beyond 1200px**.
- [ ] Confirm mobile Inputs/Results toggle keeps critical controls visible and no sideways scrolling occurs.
- [ ] Confirm all three input tabs, switch cost method, edit input, change dates, change scenario, reset to example.
- [ ] Confirm CSV file downloads in top-level and inside Wix's **effective sandbox**; CSV contains dated cash entries.
- [ ] Confirm Copy summary / Share on HTTPS (clipboard permissions vary by host/browser) and Print/PDF.
- [ ] Confirm no console errors and keyboard/screen-reader navigation.
- [ ] Confirm live Vercel landing page and Vercel embed URLs and verify Wix does not clip the iframe.
- [ ] Confirm primary CTA navigates, and user can complete destination flow (no test applicant submission without consent).
- [ ] Set canonical to actual domain after deployment and check metadata.

**Release judgment:** Financial model and source package are ready for integration review; UI **not yet certified** as fully browser-tested production-ready. Do not present visual/iframe QA as complete until tested in a working browser.
