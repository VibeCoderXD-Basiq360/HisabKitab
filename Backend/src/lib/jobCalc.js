// Mirrors the OXY Print Cost Sheet formula exactly
function computeJobCosts({ gramsUsed, filamentCostPerKg, printTimeHr, printerCostRs, printerLifeHr,
  printerPowerW, electricityRateKwh, labourOn, labourRateHr, labourHandsOnMin,
  paymentFeePct, failureRatePct, targetMarginPct, deliveryCost, jobItems = [] }) {
  const n = (v) => Number(v) || 0;

  const material      = (n(gramsUsed) / 1000) * n(filamentCostPerKg);
  const electricity   = (n(printerPowerW) / 1000) * n(printTimeHr) * n(electricityRateKwh);
  const depreciation  = n(printerLifeHr) > 0 ? (n(printerCostRs) / n(printerLifeHr)) * n(printTimeHr) : 0;
  const labour        = labourOn ? n(labourRateHr) * (n(labourHandsOnMin) / 60) : 0;
  const packagingCost = jobItems.filter(i => i.type === 'PACKAGING').reduce((s, i) => s + n(i.quantity) * n(i.unitCost), 0);
  const addOnsCost    = jobItems.filter(i => i.type !== 'PACKAGING').reduce((s, i) => s + n(i.quantity) * n(i.unitCost), 0);

  const prodBase      = material + electricity + depreciation + labour + packagingCost;
  const fr            = n(failureRatePct);
  const failFactor    = fr < 100 ? 1 / (1 - fr / 100) : 1;
  const prodCost      = prodBase * failFactor;
  const failureMarkup = prodCost - prodBase;
  const tm            = n(targetMarginPct);
  const itemPrice     = tm < 100 ? prodCost / (1 - tm / 100) : prodCost;
  const suggestedPrice = itemPrice + n(deliveryCost) + addOnsCost;
  const trueCost      = prodCost + addOnsCost + n(deliveryCost);
  const paymentFee    = suggestedPrice * n(paymentFeePct) / 100;
  const profit        = suggestedPrice - trueCost - paymentFee;
  const marginPct     = suggestedPrice > 0 ? (profit / suggestedPrice) * 100 : 0;

  return { materialCost: material, electricityCost: electricity, depreciationCost: depreciation,
    labourCost: labour, packagingCost, addOnsCost, failureMarkup, trueCost, suggestedPrice, profit, marginPct };
}

module.exports = { computeJobCosts };
