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
| Vercel deployment | OWNER-REPORTED LIVE | Production URL supplied by owner: https://holiday-inventory-cash-gap-calculat.vercel.app/; cannot independently fetch in this environment |
| Browser QA | OWNER-REPORTED PASS | Owner stated browser test passed; device matrix and evidence not provided |
| Production SEO metadata | PATCH PROPOSED | Canonical, Open Graph, Twitter card, favicon and application icon added on PR branch; recheck after merge and deployment |

## Browser/iframe QA — owner reports pass; independent verification pending

The owner reports that the site passed browser testing. A previous isolated Chromium attempt failed before rendering; in this review the public website could not be independently retrieved, so the specific browser/iframe checks below are not individually certified by this report. The following need a working desktop/mobile browser before final production sign-off:

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
- [x] Prepare canonical and metadata changes targeting the owner-supplied deployment URL (pending PR merge/production verification).

**Release judgment:** Owner reports the deployed UI works. Financial tests passed in the original package. Production-specific metadata and embed URL updates are prepared via PR. Independent browser and iframe QA are not certified by this report; retain unresolved device checks until recorded evidence exists.


## Deployment reference

- Production: https://holiday-inventory-cash-gap-calculat.vercel.app/
- Embed: https://holiday-inventory-cash-gap-calculat.vercel.app/embed.html
- GitHub: https://github.com/JFeimster/holiday-inventory-cash-gap-calculator
- Notion: https://myfunding.notion.site/holiday-inventory-cash-gap-calculator
- Asset references use existing PNGs committed to `assets/images/`. The missing dedicated 32×32 file is not claimed as shipped; the 512×512 favicon can be scaled by the browser.
