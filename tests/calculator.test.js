import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, compareScenarios, exampleInputs, moveDate, toCsv } from '../assets/calculator.js';

const base = () => ({
  ...exampleInputs('2026-10-01'), startDate:'2026-10-01',endDate:'2026-10-31',supplierDate:'2026-10-05',
  finalPaymentDate:'2026-10-15',payoutDate:'2026-10-20', costMode:'units', plannedUnits:100, unitCost:10,
  unitPrice:20, sellThrough:100, startingCash:1500, operatingOutflows:0, existingUnits:0,existingInventoryValue:0,
  inboundFreight:0, platformFeePct:0, fulfilmentCostPerUnit:0, marketingSpend:0, returnsPct:0, otherVariableCostPerUnit:0,
  additionalInflow:0,depositPct:100,financingAmount:0,financingFeePct:0,
  financingDate:'2026-10-02',repaymentStartDate:'2026-10-28',repaymentCount:1,repaymentIntervalDays:7,
  freightDate:'2026-10-15', operatingDate:'2026-10-15',fulfilmentDate:'2026-10-16',marketingDate:'2026-10-03',additionalInflowDate:'2026-10-15'
});
const byDate = (r, date) => r.timeline.find(t=>t.date===date);

test('No gap: positive cash cushion stays a zero funding requirement', () => {
  const r=calculate(base());
  assert.equal(r.money.fundingGap,0);assert.equal(r.money.cashCushion,500);
  assert.equal(r.lowestDate,'2026-10-05');assert.equal(r.money.endingWithout,2500);
  assert.equal(r.money.grossProfit,1000);assert.equal(r.money.inventoryCommitment,1000);
});
test('Supplier deposit, then final balance, creates later minimum prior to payout', () => {
  const p={...base(),startingCash:700,depositPct:40};const r=calculate(p);
  assert.equal(byDate(r,'2026-10-05').baselineCents,30000);
  assert.equal(byDate(r,'2026-10-15').baselineCents,-30000);
  assert.equal(r.money.fundingGap,300);assert.equal(r.lowestDate,'2026-10-15');
  assert.equal(r.money.endingWithout,1700);
});
test('Inadequate cash for initial supplier deposit is identified immediately',()=>{
  const r=calculate({...base(),startingCash:250,depositPct:40});
  assert.equal(r.lowestDate,'2026-10-15');assert.equal(byDate(r,'2026-10-05').baselineCents,-15000);
  assert.equal(r.money.fundingGap,750);
});
test('Sales are booked only on payout date, not when inventory is paid',()=>{
  const r=calculate({...base(),startingCash:0});
  assert.equal(byDate(r,'2026-10-19').baselineCents,-100000);
  assert.equal(byDate(r,'2026-10-20').baselineCents,100000);
  assert.equal(r.money.fundingGap,1000);assert.equal(r.daysTiedUp,15);
});
test('Slow sell-through and zero sales reduce collection but do not erase supplier commitments',()=>{
  const slow=calculate({...base(),sellThrough:25,startingCash:0});
  assert.equal(slow.assumptions.soldUnits,25);assert.equal(slow.money.collectedSales,500);assert.equal(slow.money.endingWithout,-500);
  const zero=calculate({...base(),sellThrough:0,startingCash:0});
  assert.equal(zero.assumptions.soldUnits,0);assert.equal(zero.money.collectedSales,0);assert.equal(zero.money.fundingGap,1000);
  assert.ok(zero.warnings.some(x=>x.includes('Zero units')));
});
test('Refund percentage affects collections; platform fees assessed on gross orders, once',()=>{
  const r=calculate({...base(),returnsPct:50,platformFeePct:5,fulfilmentCostPerUnit:2,startingCash:2000});
  assert.equal(r.money.grossSales,2000);assert.equal(r.money.returns,1000);assert.equal(r.money.collectedSales,1000);
  assert.equal(r.money.platformFees,100);assert.equal(r.money.fulfillment,200);
  assert.equal(r.money.grossProfit,0);assert.equal(r.money.contribution,-300);
  assert.equal(r.money.endingWithout,1700); // 2000 - 1000 + 2000 - 1000 refunds - 100 processing - 200 fulfillment
});
test('No duplicate freight cost: purchase, freight and other expenses booked once',()=>{
  const r=calculate({...base(),startingCash:0,inboundFreight:125,marketingSpend:100,operatingOutflows:300,additionalInflow:250,financingAmount:0});
  assert.equal(r.money.inventoryCommitment,1125);
  assert.equal(r.money.endingWithout,725); // 0-1000-125-100-300+250+2000
  assert.equal(r.money.grossProfit,875); // gross sales 2000 less 1000 purchased COGS and 125 freight COGS
  assert.equal(r.money.contribution,775); // marketing is contribution-level, overhead not
});
test('Existing inventory is historical cost not a new cash-outflow',()=>{
  const r=calculate({...base(),existingUnits:100,existingInventoryValue:400,startingCash:3000,sellThrough:100});
  assert.equal(r.money.inventoryCommitment,1000);
  assert.equal(r.money.collectedSales,4000);
  assert.equal(r.money.cogs,1400);
  assert.equal(r.money.grossProfit,2600);
  assert.equal(r.money.endingWithout,6000);
});
test('Financing proceeds and fee-free principal repayment on different dates are not revenue or expense',()=>{
  const r=calculate({...base(),startingCash:0,financingAmount:1200,financingDate:'2026-10-02',repaymentStartDate:'2026-10-28'});
  assert.equal(r.money.financingCost,0);
  assert.equal(byDate(r,'2026-10-03').financedCents,120000);
  assert.equal(byDate(r,'2026-10-06').financedCents,20000);
  assert.equal(r.money.fundedGap,0);
  assert.equal(r.money.grossProfit,1000);
  assert.equal(r.money.endingWith,r.money.endingWithout);
});
test('Installment rounding conserves exact principal + flat fee total',()=>{
  const r=calculate({...base(),financingAmount:100,financingFeePct:10,repaymentCount:3,repaymentStartDate:'2026-10-22',repaymentIntervalDays:4});
  const reps=r.events.filter(e=>e.description.startsWith('Repayment'));
  assert.equal(reps.length,3);
  assert.equal(reps.reduce((a,e)=>a+e.amount,0),-11000);
  assert.equal(r.money.financingCost,10);
});
test('Financing fixes earlier liquidity but repayment creates later shortfall',()=>{
  const r=calculate({...base(),startingCash:1000,unitCost:9.5,financingAmount:1000,financingFeePct:10,financingDate:'2026-10-02',repaymentStartDate:'2026-10-12'});
  assert.equal(r.money.fundingGap,0);
  assert.equal(r.money.fundedGap,50);
  assert.equal(r.financedLowestDate,'2026-10-12');
});
test('Repayment after analysis range is omitted with explicit incomplete-horizon warning',()=>{
  const r=calculate({...base(),financingAmount:1000,repaymentStartDate:'2026-11-01'});
  assert.ok(r.warnings.some(x=>x.includes('repayments fall after')));
  assert.equal(r.money.endingWith,r.money.endingWithout+1000);
});
test('Out-of-window payout cannot silently count as collected cash',()=>{
  const r=calculate({...base(),payoutDate:'2026-11-05'});
  assert.equal(r.money.endingWithout,500);
  assert.ok(r.warnings.some(x=>x.includes('payout occurs outside')));
});
test('Scenarios are explicit, deterministic, non-predictive parameter offsets',()=>{
  const [low,b,high]=compareScenarios({...base(),sellThrough:60});
  assert.deepEqual([low.assumptions.sellThrough,b.assumptions.sellThrough,high.assumptions.sellThrough],[40,60,72]);
  assert.equal(low.assumptions.payoutDate,'2026-11-03');assert.equal(high.assumptions.payoutDate,'2026-10-13');
  assert.equal(calculate(base()).money.endingWithout,calculate(base()).money.endingWithout);
});
test('Zero fee and break-even sales recovery',()=>{
  const r=calculate(base());
  assert.equal(r.money.financingCost,0);
  assert.equal(r.cashRecoveryUnits,50);
  assert.equal(r.cashRecoveryPct,50);
});
test('Currency rounding works in cents; csv exposes day-level amounts',()=>{
  const r=calculate({...base(),plannedUnits:3,unitCost:0.335,unitPrice:1.11,startingCash:10,sellThrough:100});
  assert.equal(r.money.purchase,1.01);
  assert.equal(r.money.grossSales,3.33);
  assert.match(toCsv(r),/2026-10-05/);
  assert.match(toCsv(r),/"Net financing cash flow"/);
});
test('Bad numbers, bad dates, unsupported cost modes and unrealistic windows fail safely',()=>{
  const cases=[{startingCash:-1},{startingCash:'hello'},{supplierDate:'2026-13-40'},{startDate:'2026-11-01'},{costMode:'magic'},
    {depositPct:101},{plannedUnits:1.5},{repaymentCount:0},{repaymentIntervalDays:0},{supplierDate:'2026-09-29'},
    {depositPct:20,finalPaymentDate:'2026-09-30'},{financingAmount:1,financingDate:'2026-09-30'},
    {financingAmount:1,repaymentStartDate:'2026-09-30'}];
  for (const patch of cases) assert.throws(()=>calculate({...base(),...patch}),undefined,JSON.stringify(patch));
});
test('One day past end is exact date arithmetic even across calendar boundaries',()=>{
  assert.equal(moveDate('2026-12-31',1),'2027-01-01');
  assert.equal(moveDate('2028-02-28',1),'2028-02-29');
});
