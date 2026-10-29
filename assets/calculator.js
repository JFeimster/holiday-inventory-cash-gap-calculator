/** Holiday Inventory Cash-Gap Calculator — deterministic, dependency-free model. */
const MS_DAY = 86_400_000;
const MONEY_LIMIT = 1_000_000_000;
const numeric = (value, name, max = MONEY_LIMIT) => {
  if (value === '' || value === null || value === undefined || !Number.isFinite(Number(value))) throw new Error(`${name} must be a valid number.`);
  const n = Number(value);
  if (n < 0 || n > max) throw new Error(`${name} must be between 0 and ${max.toLocaleString('en-US')}.`);
  return n;
};
const cents = n => Math.round((n + Number.EPSILON) * 100);
const dollars = n => n / 100;
const dateNumber = (str, name) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(str || ''))) throw new Error(`${name} must be a valid date.`);
  const n = Date.parse(`${str}T00:00:00Z`);
  if (!Number.isFinite(n) || new Date(n).toISOString().slice(0, 10) !== str) throw new Error(`${name} must be a valid date.`);
  return n;
};
export function moveDate(iso, days) { return new Date(dateNumber(iso, 'Date') + days * MS_DAY).toISOString().slice(0, 10); }
export function dayDifference(start, end) { return Math.round((dateNumber(end, 'End date') - dateNumber(start, 'Start date')) / MS_DAY); }
export function exampleInputs(today = new Date().toISOString().slice(0, 10)) {
  return {
    startDate: today, endDate: moveDate(today, 105), supplierDate: moveDate(today, 7), finalPaymentDate: moveDate(today, 26), payoutDate: moveDate(today, 57),
    costMode: 'units', plannedUnits: 1800, unitCost: 19, totalPurchaseCost: 34200, unitPrice: 48, sellThrough: 72,
    startingCash: 14000, operatingOutflows: 4200, operatingDate: moveDate(today, 22),
    existingUnits: 0, existingInventoryValue: 0, inboundFreight: 1900, freightDate: moveDate(today, 26),
    platformFeePct: 3, fulfilmentCostPerUnit: 3.2, fulfilmentDate: moveDate(today, 49),
    marketingSpend: 2400, marketingDate: moveDate(today, 19), returnsPct: 6, otherVariableCostPerUnit: 0,
    additionalInflow: 0, additionalInflowDate: moveDate(today, 12), depositPct: 40,
    financingAmount: 0, financingFeePct: 0, financingDate: moveDate(today, 5), repaymentStartDate: moveDate(today, 80), repaymentCount: 1, repaymentIntervalDays: 30
  };
}
function validate(raw) {
  const p = { ...raw };
  const moneyFields = ['unitCost','totalPurchaseCost','unitPrice','startingCash','operatingOutflows','existingInventoryValue','inboundFreight','fulfilmentCostPerUnit','marketingSpend','otherVariableCostPerUnit','additionalInflow','financingAmount'];
  for (const key of moneyFields) p[key] = numeric(p[key], key);
  for (const key of ['sellThrough','platformFeePct','returnsPct','depositPct','financingFeePct']) p[key] = numeric(p[key], key, key === 'financingFeePct' ? 200 : 100);
  for (const key of ['plannedUnits','existingUnits','repaymentCount','repaymentIntervalDays']) {
    p[key] = numeric(p[key], key, key === 'repaymentCount' ? 60 : key === 'repaymentIntervalDays' ? 365 : 1_000_000);
    if (!Number.isInteger(p[key])) throw new Error(`${key} must be a whole number.`);
  }
  if (p.plannedUnits === 0 && p.existingUnits === 0) throw new Error('Add planned units or existing stock before calculating.');
  if (p.plannedUnits > 0 && p.costMode === 'units' && p.unitCost === 0) throw new Error('Cost per new unit must be greater than zero.');
  if (p.costMode !== 'units' && p.costMode !== 'total') throw new Error('Choose per-unit or total inventory cost.');
  if (p.costMode === 'total' && p.plannedUnits > 0 && p.totalPurchaseCost === 0) throw new Error('Total inventory purchase must be greater than zero.');
  if (p.unitPrice === 0 && p.sellThrough > 0) throw new Error('Retail selling price must be greater than zero for positive sales.');
  if (p.repaymentCount < 1 || p.repaymentIntervalDays < 1) throw new Error('Repayment count and spacing must be at least 1.');
  const fields = ['startDate','endDate','supplierDate','finalPaymentDate','payoutDate','operatingDate','freightDate','fulfilmentDate','marketingDate','additionalInflowDate','financingDate','repaymentStartDate'];
  for (const key of fields) dateNumber(p[key], key);
  if (dayDifference(p.startDate, p.endDate) < 1 || dayDifference(p.startDate, p.endDate) > 366) throw new Error('Analysis window must be 1–366 days.');
  if (p.supplierDate < p.startDate || p.supplierDate > p.endDate) throw new Error('Supplier deposit date must be inside the analysis window.');
  if (p.finalPaymentDate < p.supplierDate) throw new Error('Final supplier payment cannot precede the deposit.');
  if (p.finalPaymentDate > p.endDate && p.depositPct < 100) throw new Error('The final supplier payment must fall inside the analysis window.');
  if (p.financingAmount && (p.financingDate < p.startDate || p.financingDate > p.endDate)) throw new Error('Financing proceeds date must fall inside the analysis window.');
  if (p.financingAmount && p.repaymentStartDate < p.financingDate) throw new Error('First repayment cannot precede financing proceeds.');
  return p;
}
function pctOf(c, percent) { return Math.round(c * percent / 100); }
function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
/** Returns cents-safe daily ledger, dated events, economics, and warnings. Never mutates input. */
export function calculate(raw, options = {}) {
  const p = validate(raw);
  const label = options.label || 'Base';
  const sellThrough = clamp(p.sellThrough + (options.sellThroughDelta || 0), 0, 100);
  const payoutDate = moveDate(p.payoutDate, options.payoutShiftDays || 0);
  const notes = [];
  const totalUnits = p.plannedUnits + p.existingUnits;
  const soldUnits = Math.floor((totalUnits * sellThrough / 100) + 1e-10);
  const purchase = p.costMode === 'units' ? cents(p.plannedUnits * p.unitCost) : cents(p.totalPurchaseCost);
  const unitPurchase = p.plannedUnits ? purchase / p.plannedUnits : 0;
  const soldExisting = Math.min(soldUnits, p.existingUnits);
  const soldNew = soldUnits - soldExisting;
  const existingCogs = p.existingUnits ? Math.round(cents(p.existingInventoryValue) * soldExisting / p.existingUnits) : 0;
  const purchasedCogs = Math.round(unitPurchase * soldNew);
  const freight = cents(p.inboundFreight);
  const freightCogs = p.plannedUnits ? Math.round(freight * soldNew / p.plannedUnits) : 0;
  const grossSales = cents(soldUnits * p.unitPrice);
  const returns = pctOf(grossSales, p.returnsPct);
  const collectedSales = grossSales - returns;
  const platformFees = pctOf(grossSales, p.platformFeePct); // charged on gross orders, irrespective of refunds
  const fulfillment = cents(soldUnits * p.fulfilmentCostPerUnit);
  const variable = cents(soldUnits * p.otherVariableCostPerUnit);
  const marketing = cents(p.marketingSpend);
  const operating = cents(p.operatingOutflows);
  const contribution = collectedSales - existingCogs - purchasedCogs - freightCogs - platformFees - fulfillment - variable - marketing;
  const grossProfit = collectedSales - existingCogs - purchasedCogs - freightCogs;
  const deposit = pctOf(purchase, p.depositPct);
  const finalPayment = purchase - deposit;
  const financePrincipal = cents(p.financingAmount);
  const financeFee = pctOf(financePrincipal, p.financingFeePct);
  const inflow = cents(p.additionalInflow);
  const events = [];
  function add(date, type, description, amount, finance = false) {
    if (amount !== 0) events.push({ date, type, description, amount, finance });
  }
  add(p.supplierDate, 'inventory', 'Supplier deposit', -deposit);
  add(p.finalPaymentDate, 'inventory', 'Supplier balance', -finalPayment);
  add(p.freightDate, 'inventory', 'Freight / inbound handling', -freight);
  add(p.operatingDate, 'operating', 'Other operating cash outflows', -operating);
  add(p.marketingDate, 'operating', 'Advertising / marketing', -marketing);
  add(p.fulfilmentDate, 'operating', 'Fulfillment costs', -fulfillment);
  add(p.fulfilmentDate, 'operating', 'Other variable costs', -variable);
  add(payoutDate, 'sales', 'Gross customer payout', grossSales);
  add(payoutDate, 'sales', 'Returns / refunds allowance', -returns);
  add(payoutDate, 'operating', 'Platform / processing fees', -platformFees);
  add(p.additionalInflowDate, 'other_inflow', 'Other cash inflow', inflow);
  add(p.financingDate, 'financing', 'Hypothetical financing proceeds', financePrincipal, true);
  if (financePrincipal) {
    const totalRepayment = financePrincipal + financeFee;
    let allocated = 0;
    for (let i = 0; i < p.repaymentCount; i++) {
      const repaymentDate = moveDate(p.repaymentStartDate, i * p.repaymentIntervalDays);
      const installment = i === p.repaymentCount - 1 ? totalRepayment - allocated : Math.floor(totalRepayment / p.repaymentCount);
      allocated += installment;
      add(repaymentDate, 'financing', `Repayment ${i + 1}/${p.repaymentCount} (principal + fee)`, -installment, true);
    }
  }
  const allEvents = events.sort((a,b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));
  const dailyByDate = new Map();
  for (const e of allEvents) {
    if (!dailyByDate.has(e.date)) dailyByDate.set(e.date, []);
    dailyByDate.get(e.date).push(e);
  }
  const days = dayDifference(p.startDate, p.endDate);
  const startCash = cents(p.startingCash);
  let baseline = startCash, funded = startCash, minBase = startCash, minFunded = startCash, lowBaseDate = p.startDate, lowFundedDate = p.startDate;
  const timeline = [];
  for (let i = 0; i <= days; i++) {
    const date = moveDate(p.startDate, i);
    const todays = dailyByDate.get(date) || [];
    const nonFinanceDelta = todays.filter(e => !e.finance).reduce((s,e) => s + e.amount, 0);
    const financeDelta = todays.filter(e => e.finance).reduce((s,e) => s + e.amount, 0);
    baseline += nonFinanceDelta;
    funded += nonFinanceDelta + financeDelta;
    if (baseline < minBase) { minBase = baseline; lowBaseDate = date; }
    if (funded < minFunded) { minFunded = funded; lowFundedDate = date; }
    timeline.push({ date, baselineCents: baseline, financedCents: funded, operatingNetCents: nonFinanceDelta, financingNetCents: financeDelta, events: todays });
  }
  if (p.existingUnits > 0 && p.existingInventoryValue === 0) notes.push('Existing stock is valued at $0 for profit accounting; add its cost basis for meaningful gross-profit estimates.');
  if (payoutDate < p.startDate || payoutDate > p.endDate) notes.push('This scenario’s sales payout occurs outside the analysis window; its cash receipt is excluded from the cash timeline.');
  const lateFinance = allEvents.some(e => e.finance && e.date > p.endDate);
  if (lateFinance) notes.push('Some financing repayments fall after the analysis end date and are excluded from ending cash and minimum cash. Extend the window to see them.');
  if (p.additionalInflow > 0 && (p.additionalInflowDate < p.startDate || p.additionalInflowDate > p.endDate)) notes.push('Additional inflow is outside the analysis period and is not in the ending balance.');
  if (p.marketingSpend > 0 && (p.marketingDate < p.startDate || p.marketingDate > p.endDate)) notes.push('Some advertising costs fall outside the analysis period and are not in the ending balance.');
  if (soldUnits === 0) notes.push('Zero units sold: no modeled sales collections; fixed commitments still reduce cash.');
  if (p.returnsPct >= 50) notes.push('High refund allowance may materially change net payout and cash needs.');
  if (minFunded < 0 && financePrincipal) notes.push('The financing scenario still has a cash shortfall; borrowing does not automatically solve a liquidity problem.');
  if (p.financingFeePct > 0) notes.push('Financing fee is a hypothetical one-time flat percentage, not an APR, quote, or effective borrowing cost.');
  if (p.freightDate < p.startDate || p.freightDate > p.endDate || p.fulfilmentDate < p.startDate || p.fulfilmentDate > p.endDate || p.operatingDate < p.startDate || p.operatingDate > p.endDate) notes.push('At least one cost date is outside the modeled period; that transaction is excluded from ending cash.');
  const netPerUnit = (p.unitPrice * (1 - p.returnsPct / 100 - p.platformFeePct / 100) - p.fulfilmentCostPerUnit - p.otherVariableCostPerUnit);
  const recoverCosts = dollars(purchase + freight + marketing + operating);
  const cashRecoveryUnits = netPerUnit > 0 ? Math.ceil((recoverCosts / netPerUnit) - 1e-10) : null;
  const cashRecoveryPct = cashRecoveryUnits === null ? null : cashRecoveryUnits / totalUnits * 100;
  if (cashRecoveryPct !== null && cashRecoveryPct > 100) notes.push('Sales alone cannot recover all modeled inventory and cash spending within the available unit volume.');
  const firstPay = deposit ? p.supplierDate : finalPayment ? p.finalPaymentDate : freight ? p.freightDate : null;
  return {
    label, assumptions: { sellThrough, payoutDate, soldUnits, totalUnits },
    money: {
      inventoryCommitment: dollars(purchase + freight), purchase: dollars(purchase), freight: dollars(freight), grossSales: dollars(grossSales), returns: dollars(returns), collectedSales: dollars(collectedSales),
      grossProfit: dollars(grossProfit), contribution: dollars(contribution), cogs: dollars(existingCogs + purchasedCogs + freightCogs), platformFees: dollars(platformFees), fulfillment: dollars(fulfillment),
      marketing: dollars(marketing), variable: dollars(variable), operating: dollars(operating), financingCost: dollars(financeFee), financePrincipal: dollars(financePrincipal),
      additionalInflow: dollars(inflow), fundingGap: dollars(Math.max(0, -minBase)), fundedGap: dollars(Math.max(0, -minFunded)), cashCushion: dollars(Math.max(0, minBase)),
      endingWithout: dollars(baseline), endingWith: dollars(funded), lowestWithout: dollars(minBase), lowestWith: dollars(minFunded)
    },
    lowestDate: lowBaseDate, financedLowestDate: lowFundedDate,
    daysTiedUp: firstPay ? Math.max(0, dayDifference(firstPay, payoutDate)) : 0,
    cashRecoveryUnits, cashRecoveryPct,
    warnings: notes, timeline, events: allEvents, rawInputs: {...p}
  };
}
export function compareScenarios(raw) {
  return [
    calculate(raw, { label: 'Conservative', sellThroughDelta: -20, payoutShiftDays: 14 }),
    calculate(raw, { label: 'Base' }),
    calculate(raw, { label: 'Optimistic', sellThroughDelta: 12, payoutShiftDays: -7 })
  ];
}
export function toCsv(result) {
  const f = value => `"${String(value).replaceAll('"','""')}"`;
  const lines = [
    ['Report','Holiday Inventory Cash-Gap Calculator'],
    ['Generated',new Date().toISOString()],
    ['Scenario',result.label],
    ['Sell-through %',result.assumptions.sellThrough],
    ['Cash gap',result.money.fundingGap],
    ['Financed cash gap',result.money.fundedGap],
    ['Disclaimer','Educational scenario only. Not an offer, loan quote or financial advice.'],
    [],
    ['Date','Net operating + sales cash flow','Net financing cash flow','Balance without financing','Balance with financing','Transactions']
  ];
  for (const d of result.timeline) lines.push([d.date, dollars(d.operatingNetCents).toFixed(2), dollars(d.financingNetCents).toFixed(2), dollars(d.baselineCents).toFixed(2), dollars(d.financedCents).toFixed(2), d.events.map(e => e.description).join('; ')]);
  return '\ufeff' + lines.map(row => row.map(f).join(',')).join('\r\n') + '\r\n';
}
