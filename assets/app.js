import { calculate, compareScenarios, exampleInputs, toCsv } from './calculator.js';
import { commercialConfig } from './config.js';

const embed = document.body.classList.contains('mode-embed');
const root = document.querySelector('#app');
let state = exampleInputs();
let results = [];
let scenario = 'Base';
let currentTab = 'basics';
let mobileResults = false;
let edited = false;
const USD = new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 });
const USD2 = new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', minimumFractionDigits:2, maximumFractionDigits:2 });
const percent = n => `${Number(n).toFixed(1).replace(/\.0$/,'')}%`;
const money = n => USD.format(n);
const numberInput = (id, label, tip, opts = {}) => `<label class="field ${opts.extraClass || ''}" for="${id}"><span class="field-title">${label}</span><input id="${id}" name="${id}" type="number" min="0" step="${opts.step || 'any'}" ${opts.max !== undefined ? `max="${opts.max}"`:''} inputmode="decimal" aria-describedby="hint-${id}" value="${state[id]}"><small id="hint-${id}">${tip}</small></label>`;
const dateInput = (id, label, tip) => `<label class="field" for="${id}"><span class="field-title">${label}</span><input id="${id}" name="${id}" type="date" aria-describedby="hint-${id}" value="${state[id]}"><small id="hint-${id}">${tip}</small></label>`;
const basicFields = () => `
  <div class="section-intro"><strong>Inventory order & demand</strong><span>Replace the example values with your assumptions.</span></div>
  <div class="fields">
    <label class="field" for="costMode"><span class="field-title">Inventory cost method</span><select id="costMode" name="costMode"><option value="units" ${state.costMode==='units'?'selected':''}>Cost per unit</option><option value="total" ${state.costMode==='total'?'selected':''}>Total purchase cost</option></select><small>New inventory to be purchased</small></label>
    ${numberInput('plannedUnits','New inventory units','Units being ordered',{step:1})}
    <div class="cost-units">${numberInput('unitCost','Cost per new unit ($)','Before inbound freight')}</div>
    <div class="cost-total">${numberInput('totalPurchaseCost','Total inventory purchase ($)','Excludes inbound freight')}</div>
    ${numberInput('unitPrice','Retail price per unit ($)','Expected average selling price')}
    ${numberInput('sellThrough','Sell-through (%)','Percent of available units sold',{max:100})}
    ${numberInput('startingCash','Available starting cash ($)','Cash available at analysis start')}
    ${numberInput('operatingOutflows','Other operating outflows ($)','Overhead; excludes costs listed in Costs tab')}
  </div><div class="section-intro section-intro-spaced"><strong>Cash timing</strong><span>Payout date means cash received, not order date.</span></div>
  <div class="fields">
    ${dateInput('startDate','Analysis starts','Beginning cash balance date')}
    ${dateInput('endDate','Analysis ends','Up to 366 days from start')}
    ${dateInput('supplierDate','Supplier deposit date','First inventory cash payment')}
    ${dateInput('payoutDate','Sales payout date','When proceeds hit your account')}
  </div>`;
const costsFields = () => `<div class="section-intro"><strong>Costs & payout adjustments</strong><span>Optional assumptions. Each cost is counted once.</span></div><div class="fields">
${numberInput('existingUnits','Existing units in stock','Already owned; no new cash purchase',{step:1})}
${numberInput('existingInventoryValue','Existing stock cost basis ($)','Used for gross profit, not new cash outflow')}
${numberInput('inboundFreight','Freight, duties & handling ($)','New inventory commitment')}
${dateInput('freightDate','Freight payment date','Cash leaves on this date')}
${numberInput('platformFeePct','Platform / processor fee (%)','Percent of gross sales',{max:100})}
${numberInput('returnsPct','Returns / refunds (%)','Percent of gross sales',{max:100})}
${numberInput('fulfilmentCostPerUnit','Fulfillment per sold unit ($)','Per unit shipped')}
${dateInput('fulfilmentDate','Fulfillment payment date','Cash leaves on this date')}
${numberInput('marketingSpend','Marketing spend ($)','Cash paid before or during campaign')}
${dateInput('marketingDate','Marketing payment date','Cash leaves on this date')}
${numberInput('otherVariableCostPerUnit','Other cost per unit sold ($)','Not included elsewhere')}
${dateInput('operatingDate','Overhead payment date','Cash leaves on this date')}
${numberInput('additionalInflow','Other cash inflow ($)','Unrelated to inventory sales')}
${dateInput('additionalInflowDate','Other inflow date','When funds arrive')}
</div>`;
const financeFields = () => `<div class="section-intro"><strong>Payment schedule</strong><span>Supplier deposit and hypothetical financing are modeled on their actual dates.</span></div><div class="fields">
${numberInput('depositPct','Supplier deposit (%)','Remainder paid on final date',{max:100})}
${dateInput('finalPaymentDate','Supplier final payment','Must be on/after deposit date')}
${numberInput('financingAmount','Hypothetical advance ($)','Set to $0 to disable financing')}
${numberInput('financingFeePct','Total flat financing fee (%)','One-time assumed fee, NOT an APR',{max:200})}
${dateInput('financingDate','Financing proceeds date','When capital arrives')}
${dateInput('repaymentStartDate','First repayment date','Principal and fee installments')}
${numberInput('repaymentCount','Number of repayments','1 = lump sum; max 60',{step:1,max:60})}
${numberInput('repaymentIntervalDays','Days between repayments','Spacing between installments',{step:1,max:365})}
</div><p class="mini-disclosure">Financing is purely illustrative. A real funding provider may use different pricing, withheld proceeds, daily remittances, repayment amounts or fees.</p>`;

root.innerHTML = `
<header class="topbar"><a class="brand" href="https://www.distilledfunding.com" target="_blank" rel="noopener noreferrer" aria-label="Moonshine Capital website"><span class="brandmark">M<span class="brand-dot">.</span></span><span class="brand-text">MOONSHINE <b>CAPITAL</b><small>TOOLS / CASH FLOW LAB</small></span></a><span class="topbar-right">FREE FINANCIAL MODEL <span class="topbar-spark">✦</span></span></header>
<main>
<section class="hero" aria-labelledby="page-title"><div class="hero-inner"><div class="eyebrow"><span class="signal"></span> INVENTORY INTELLIGENCE <span class="eyebrow-divider">/</span> HOLIDAY EDITION</div><h1 id="page-title">Can you afford to <em>stock up</em> for the holiday rush?</h1><p>Inventory can be profitable and still drain your bank account. Model supplier payments, delayed payouts, and the cash you actually need to bridge the gap.</p><div class="hero-badges"><span>01 / MAP THE CASH</span><span>02 / STRESS TEST</span><span>03 / PLAN YOUR NEXT MOVE</span></div></div><div class="hero-orb" aria-hidden="true"><span>THE GAP</span><strong>≠</strong><span>THE PROFIT</span></div></section>
<section class="workspace" aria-label="Cash gap calculator">
  <div class="workspace-heading"><div><div class="kicker">THE CALCULATOR</div><h2>Build your cash-flow picture<span class="green-punct">.</span></h2></div><div class="workspace-actions"><button type="button" id="reset" class="link-button">↺ Reset example</button><span class="example-tag" id="exampleTag">ILLUSTRATIVE EXAMPLE</span></div></div>
  <div class="mobile-mode-toggle" aria-label="Mobile calculator view"><button type="button" id="showInputs" class="active" aria-pressed="true">Inputs</button><button type="button" id="showResults" aria-pressed="false">Results</button></div>
  <div class="calculator-grid"><div class="input-card"><div class="input-tabs" role="tablist" aria-label="Input sections"><button role="tab" aria-selected="true" type="button" data-tab="basics" id="tab-basics" aria-controls="panel-basics">01 Basics</button><button role="tab" aria-selected="false" type="button" data-tab="costs" id="tab-costs" aria-controls="panel-costs">02 Costs</button><button role="tab" aria-selected="false" type="button" data-tab="financing" id="tab-financing" aria-controls="panel-financing">03 Funding</button></div><form id="calculatorForm" novalidate><div class="tab-panel" id="panel-basics" role="tabpanel" aria-labelledby="tab-basics">${basicFields()}</div><div class="tab-panel" id="panel-costs" role="tabpanel" aria-labelledby="tab-costs" hidden>${costsFields()}</div><div class="tab-panel" id="panel-financing" role="tabpanel" aria-labelledby="tab-financing" hidden>${financeFields()}</div></form><div class="input-footer"><span><span class="live-indicator"></span> Instant recalculation</span><span>No personal data collected</span></div></div>
  <section class="results-card" aria-labelledby="results-title"><div class="results-top"><div class="kicker">YOUR LIQUIDITY FORECAST</div><div class="scenario-switch" role="group" aria-label="Sales forecast scenarios"><button data-scenario="Conservative" type="button">Conservative</button><button data-scenario="Base" class="active" type="button" aria-pressed="true">Base</button><button data-scenario="Optimistic" type="button">Optimistic</button></div></div><div id="errorBox" role="alert" class="error-box" hidden></div><div id="resultsLive" aria-live="polite" aria-atomic="false"><div class="metric-head"><div class="metric-label" id="gapLabel">PROJECTED CASH GAP</div><div class="big-number" id="gapAmount">—</div><p class="metric-sub" id="gapDescription">Calculating your inventory timeline…</p></div><div class="metric-strip"><div><span>LOW POINT DATE</span><strong id="lowDate">—</strong></div><div><span>ENDING CASH</span><strong id="endCash">—</strong></div><div><span>CAPITAL TIED UP</span><strong id="tiedDays">—</strong></div></div><div class="chart-heading"><strong>Cash balance over time</strong><span id="chartLegend">Without / with funding</span></div><div class="chart-frame" id="chartFrame" role="img" aria-label="Cash balance timeline chart"></div><div class="funding-comparison"><div><span>WITHOUT FINANCING · LOWEST</span><strong id="withoutMin">—</strong></div><div><span>WITH FINANCING · LOWEST</span><strong id="withMin">—</strong></div></div><p class="model-note" id="forecastNote"></p></div>
  <div class="result-cta"><a class="primary-cta" id="primaryCta" target="_blank" rel="noopener noreferrer">Explore Inventory Funding Options <span>↗</span></a><p>Explore potential options based on your business. This calculation is not an eligibility or approval decision.</p><div class="result-tools"><button type="button" id="csv" title="Download modeled cash timeline">↓ CSV</button><button type="button" id="copy" title="Copy results to clipboard">⧉ Copy</button><button type="button" id="print" title="Print or save report as PDF">▤ Print</button><button type="button" id="share" title="Copy standalone calculator link">↗ Share</button></div><div class="action-status" id="actionStatus" aria-live="polite"></div></div></section></div>
  <div class="expanded-results"><div class="kicker">BEYOND THE CASH GAP</div><h2>The numbers behind the pressure<span class="green-punct">.</span></h2><div id="economicsTable"></div><div id="warnings"></div></div>
</section>
<section class="editorial"><div class="editorial-heading"><div class="kicker">THE METHODOLOGY</div><h2>Your margin is not your liquidity.</h2><p>A profitable holiday rush can still create a funding shortfall if deposits, freight, payroll, ads, and fulfillment happen before the marketplace sends your cash.</p></div><div class="editorial-grid"><article><span>01</span><h3>Timing creates the gap</h3><p>We group dated cash transactions into a daily ledger and find its lowest balance. That is the cash-gap estimate—not inventory cost minus cash.</p></article><article><span>02</span><h3>Profit is separate</h3><p>Expected net sales less cost of sold goods estimates gross profit. Other specified selling and campaign costs determine contribution.</p></article><article><span>03</span><h3>Financing changes timing</h3><p>A hypothetical advance adds cash on its funding date, while repayments and fees reduce it later. You can create a second shortage by borrowing badly.</p></article></div><div class="faq"><h2>Common questions</h2><details><summary>Does a profitable season guarantee positive cash flow?</summary><p>No. Cash is modeled by payment and collection dates. Gross profit does not account for when your supplier or platform settles.</p></details><details><summary>Do these results predict my holiday sales?</summary><p>No. Conservative and optimistic cases are explicit changes to your assumed sell-through and collection date, not generated predictions.</p></details><details><summary>What is the sales recovery threshold?</summary><p>It estimates the minimum units to recover modeled cash spending from sales after refunds, platform fees, fulfillment, and variable selling costs. It excludes the starting cash cushion, other cash inflows and financing; it is not a projected funding requirement.</p></details><details><summary>Does the calculator include every real-life cost?</summary><p>No. You must enter your own assumptions. It does not model taxes, sales tax, multi-batch stock, interest compounding, inventory aging, complex return settlements, or daily marketplace payout reserves.</p></details><details><summary>Will using this tool submit my financial information?</summary><p>No. Calculations run locally in your browser. Downloading, printing, and copying use your device. Funding links open separate websites only if you choose to click.</p></details></div></section>
</main><footer class="footer"><div><b>MOONSHINE CAPITAL</b> <span>TOOLS FOR OPERATORS, NOT GUESSWORK.</span></div><p>Educational planning estimates only; not investment, tax, legal or lending advice. No financing guarantee, quotes, or approvals.</p><a href="https://www.distilledfunding.com" target="_blank" rel="noopener noreferrer">DISTILLEDFUNDING.COM ↗</a></footer><section id="printReport" aria-label="Printable cash-flow report"></section>
`;

const el = id => document.getElementById(id);
function updateCostMode() {
  document.querySelectorAll('.cost-units').forEach(e => e.hidden = state.costMode !== 'units');
  document.querySelectorAll('.cost-total').forEach(e => e.hidden = state.costMode !== 'total');
}
function setTab(next) {
  currentTab = next;
  document.querySelectorAll('[data-tab]').forEach(b => {const active = b.dataset.tab === next; b.setAttribute('aria-selected', String(active)); b.classList.toggle('active', active);});
  document.querySelectorAll('.tab-panel').forEach(p => p.hidden = p.id !== `panel-${next}`);
}
function setMobileResults(on) {
  mobileResults = on;
  root.classList.toggle('show-mobile-results', on);
  el('showResults').classList.toggle('active', on);
  el('showInputs').classList.toggle('active', !on);
  el('showResults').setAttribute('aria-pressed', String(on));
  el('showInputs').setAttribute('aria-pressed', String(!on));
}
function dateLabel(d) { return new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'}); }
function chartSvg(result) {
  const a = result.timeline;
  const W=600,H=244,L=68,R=12,T=15,B=31;
  let lo=Math.min(0,...a.map(x=> Math.min(x.baselineCents,x.financedCents)))/100;
  let hi=Math.max(0,...a.map(x=> Math.max(x.baselineCents,x.financedCents)))/100;
  if (hi===lo) {hi+=100;lo-=100;}
  const pad = Math.max(100,(hi-lo)*.07); lo-=pad;hi+=pad;
  const x = i => L+(W-L-R)*i/Math.max(1,a.length-1);
  const y = n => T+(H-T-B)*(hi-n)/(hi-lo);
  const makePath = key => a.map((v,i)=>`${i?'L':'M'}${x(i).toFixed(2)},${y(v[key]/100).toFixed(2)}`).join(' ');
  const zero = y(0);
  const ticks=[0,1,2,3,4].map(i=>{const v=lo+(hi-lo)*i/4;const py=y(v);return `<line x1="${L}" y1="${py}" x2="${W-R}" y2="${py}" class="gridline"/><text x="${L-10}" y="${py+4}" text-anchor="end" class="axis-label">${money(v)}</text>`}).join('');
  const id='cashFill';
  const baselinePath=makePath('baselineCents');
  const fundedPath=makePath('financedCents');
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" preserveAspectRatio="xMidYMid meet"><defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#45E68F" stop-opacity=".20"/><stop offset="1" stop-color="#45E68F" stop-opacity="0"/></linearGradient></defs>${ticks}<line x1="${L}" x2="${W-R}" y1="${zero}" y2="${zero}" stroke="#f47789" stroke-width="1.5" stroke-dasharray="5 6"/><path d="${baselinePath} L${x(a.length-1)},${H-B} L${L},${H-B} Z" fill="url(#${id})"/><path d="${baselinePath}" stroke="#23b975" stroke-width="3" fill="none" stroke-linejoin="round"/><path d="${fundedPath}" stroke="#a78bfa" stroke-width="2.8" fill="none" stroke-linejoin="round" stroke-dasharray="7 4"/><text x="${L}" y="${H-5}" class="axis-label">${dateLabel(a[0].date)}</text><text x="${W-R}" y="${H-5}" text-anchor="end" class="axis-label">${dateLabel(a[a.length-1].date)}</text></svg>`;
}
function modelReport(r) {
  const m = r.money;
  const rows = [
    ['New inventory + inbound freight',m.inventoryCommitment],['Expected customer collections (net of refunds)',m.collectedSales],['Est. gross profit (after sold inventory cost)',m.grossProfit],['Est. contribution (after selling & campaign costs)',m.contribution],['Operating outflows (additional overhead)',m.operating],['Borrowing cost (flat fee, if supplied)',m.financingCost],['Minimum cash / no financing',m.lowestWithout],['Minimum cash / with financing',m.lowestWith],['Ending cash / no financing',m.endingWithout],['Ending cash / with financing',m.endingWith]
  ];
  el('economicsTable').innerHTML = `<div class="economics-grid">${rows.map(([k,v])=>`<div class="economics-row"><span>${k}</span><strong>${USD2.format(v)}</strong></div>`).join('')}</div><div class="recovery-note"><b>Sales cash-spend recovery:</b> ${r.cashRecoveryUnits === null ? 'Not determinable (net cash proceeds per unit are zero or negative).' : `${r.cashRecoveryUnits.toLocaleString()} units / ${percent(r.cashRecoveryPct)} of available units. ${r.cashRecoveryPct>100?'This exceeds your available inventory.':''}`}</div>`;
  el('warnings').innerHTML = r.warnings.length ? `<h3>Model flags</h3><ul>${r.warnings.map(w=>`<li>${w}</li>`).join('')}</ul>` : '<p class="all-clear">No additional model flags in this scenario.</p>';
  const assumptions = Object.entries(r.rawInputs).map(([k,v])=>`<tr><th>${k.replace(/([A-Z])/g,' $1')}</th><td>${v}</td></tr>`).join('');
  el('printReport').innerHTML = `<h1>Holiday Inventory Cash-Gap Report</h1><p>Moonshine Capital / Distilled Funding · Generated ${new Date().toLocaleDateString('en-US')} · ${r.label} scenario</p><p>Sale assumptions: ${r.assumptions.soldUnits} units sold, ${percent(r.assumptions.sellThrough)} sell-through; cash collection ${r.assumptions.payoutDate}.</p><h2>Cash position</h2><p><b>Gap without financing:</b> ${money(m.fundingGap)} on ${r.lowestDate}; <b>gap with financing:</b> ${money(m.fundedGap)} on ${r.financedLowestDate}.</p><p><b>Ending cash without:</b> ${money(m.endingWithout)}; <b>with financing:</b> ${money(m.endingWith)}.</p><h2>Financial outcomes</h2><table>${rows.map(([k,v])=>`<tr><th>${k}</th><td>${USD2.format(v)}</td></tr>`).join('')}</table><h2>Inputs</h2><table>${assumptions}</table><h2>Methodology</h2><p>Daily dated cash-in and cash-out ledger; cash gap equals max(0, negative lowest cash balance). Gross profit uses net expected collections minus allocated sold inventory costs. Financing proceeds and principal repayments are separate from operating profit. One-time hypothetical fee paid alongside repayment. Costs on the same day are net-settled. Returns are modeled as a same-day reduction of payout.</p><h2>Important limitations</h2><p>${r.warnings.join(' ') || 'No additional model flags.'}</p><p>Educational scenarios, not forecasts, underwriting, financing offers, or professional advice. Real payment and cash-settlement timing may differ.</p>`;
}
function renderResults() {
  try {
    results = compareScenarios(state);
    const r = results.find(x=>x.label===scenario);
    const m = r.money;
    el('resultsLive').hidden=false;
    el('errorBox').hidden=true;
    el('csv').disabled=false;el('copy').disabled=false;el('print').disabled=false;
    el('gapLabel').textContent = m.fundingGap > 0 ? 'PROJECTED CASH GAP' : 'NO PROJECTED CASH SHORTFALL';
    el('gapAmount').textContent = money(m.fundingGap);
    el('gapAmount').classList.toggle('safe',m.fundingGap===0);
    el('gapDescription').textContent = m.fundingGap > 0 ? `Extra cash needed to avoid dropping below $0. Lowest balance: ${money(m.lowestWithout)}.` : `Lowest projected balance: ${money(m.lowestWithout)} — an estimated cash cushion, not a borrowing need.`;
    el('lowDate').textContent=dateLabel(r.lowestDate);
    el('endCash').textContent=money(m.endingWithout);
    el('tiedDays').textContent=`${r.daysTiedUp} days`;
    el('withoutMin').textContent=money(m.lowestWithout);
    el('withMin').textContent=money(m.lowestWith);
    el('chartFrame').innerHTML=chartSvg(r);
    el('chartFrame').setAttribute('aria-label',`${r.label} cash-balance timeline: minimum without financing ${money(m.lowestWithout)}, with financing ${money(m.lowestWith)}. Zero is marked by the pink dashed line.`);
    el('forecastNote').textContent = `${r.label} case · ${percent(r.assumptions.sellThrough)} sell-through · expected payout ${dateLabel(r.assumptions.payoutDate)}. Financing proceeds ${money(m.financePrincipal)}; modeled fee ${money(m.financingCost)}.`;
    modelReport(r);
    document.querySelectorAll('[data-scenario]').forEach(b=>{let on=b.dataset.scenario===scenario;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  } catch (err) {
    results=[];
    el('resultsLive').hidden=true;
    el('errorBox').hidden=false;
    el('errorBox').textContent=`Please check your inputs: ${err.message}`;
    for (const id of ['csv','copy','print']) el(id).disabled=true;
    el('economicsTable').innerHTML='';el('warnings').innerHTML='';el('printReport').innerHTML='';
  }
}
function getResult() { return results.find(x=>x.label===scenario); }
function setStatus(str) { el('actionStatus').textContent=str; }
async function copyText(text) {
  if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text);return; }
  const field=document.createElement('textarea');field.value=text;field.style.position='fixed';field.style.opacity='0';document.body.append(field);field.select();const ok=document.execCommand('copy');field.remove();if(!ok) throw new Error('Clipboard access unavailable');
}
function summaryText(r) {let m=r.money;return `Holiday Inventory Cash-Gap Calculator — ${r.label} case\nAnalysis: ${r.rawInputs.startDate} to ${r.rawInputs.endDate}\nNew inventory cash commitment: ${USD2.format(m.inventoryCommitment)}\nExpected collected sales: ${USD2.format(m.collectedSales)}\nEstimated gross profit: ${USD2.format(m.grossProfit)}\nEstimated contribution: ${USD2.format(m.contribution)}\nCash gap: ${USD2.format(m.fundingGap)} (${r.lowestDate})\nLowest balance with financing: ${USD2.format(m.lowestWith)} (${r.financedLowestDate})\nEnding cash without / with financing: ${USD2.format(m.endingWithout)} / ${USD2.format(m.endingWith)}\nSell-through: ${percent(r.assumptions.sellThrough)}; payout date: ${r.assumptions.payoutDate}\nIllustrative scenario only; not a funding quote or financial advice.`; }
function downloadCsv() {
  const r = getResult(); if(!r)return;
  const blob=new Blob([toCsv(r)],{type:'text/csv;charset=utf-8'});
  const link=document.createElement('a');const url=URL.createObjectURL(blob);link.href=url;link.download=`inventory-cash-gap-${scenario.toLowerCase()}-${r.rawInputs.startDate}.csv`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);setStatus('Daily cash-flow CSV downloaded.');
}
function setup() {
  // Production canonical/OG URL is deliberately omitted until verified, not guessed.
  if (!embed && commercialConfig.canonicalUrl && /^https:\/\//.test(commercialConfig.canonicalUrl)) {
    const canonical=document.createElement('link');canonical.rel='canonical';canonical.href=commercialConfig.canonicalUrl;document.head.append(canonical);
    const og=document.createElement('meta');og.setAttribute('property','og:url');og.content=commercialConfig.canonicalUrl;document.head.append(og);
  }
  const primary=commercialConfig.primary;
  if (primary.verified && /^https:\/\//.test(primary.url)) {el('primaryCta').href=primary.url;el('primaryCta').textContent='';el('primaryCta').append(document.createTextNode(primary.label+' '));const s=document.createElement('span');s.textContent='↗';el('primaryCta').append(s);}
  else el('primaryCta').hidden=true;
  el('calculatorForm').addEventListener('input',e=>{if(!e.target.name)return;state[e.target.name]=e.target.value;edited=true;el('exampleTag').textContent='CUSTOM ASSUMPTIONS';updateCostMode();renderResults();});
  el('calculatorForm').addEventListener('change',e=>{if(!e.target.name)return;state[e.target.name]=e.target.value;edited=true;el('exampleTag').textContent='CUSTOM ASSUMPTIONS';updateCostMode();renderResults();});
  el('calculatorForm').addEventListener('submit',e=>e.preventDefault());
  document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));
  document.querySelectorAll('[data-scenario]').forEach(b=>b.addEventListener('click',()=>{scenario=b.dataset.scenario;renderResults();}));
  el('reset').addEventListener('click',()=>{state=exampleInputs();scenario='Base';edited=false;el('exampleTag').textContent='ILLUSTRATIVE EXAMPLE';for(const e of el('calculatorForm').elements){if(e.name){e.value=state[e.name];}}updateCostMode();setTab('basics');setStatus('Example assumptions restored.');renderResults();});
  el('showInputs').addEventListener('click',()=>setMobileResults(false));
  el('showResults').addEventListener('click',()=>setMobileResults(true));
  el('csv').addEventListener('click',downloadCsv);
  el('copy').addEventListener('click',async()=>{try{const r=getResult();if(!r)return;await copyText(summaryText(r));setStatus('Results summary copied.');}catch{setStatus('Clipboard unavailable; use CSV or Print instead.');}});
  el('share').addEventListener('click',async()=>{try {const url=new URL('./index.html',location.href).href;await copyText(url);setStatus('Standalone calculator link copied (no financial details included).');}catch{setStatus('Copy unavailable. Open the standalone calculator in a new tab.');}});
  el('print').addEventListener('click',()=>window.print());
  updateCostMode();setTab('basics');renderResults();
  if (embed) {
    const link=document.createElement('a');link.className='standalone-link';link.href=new URL('./index.html',location.href).href;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Open full calculator ↗';el('reset').parentNode.insertBefore(link,el('reset'));
  }
}
setup();
