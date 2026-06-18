export function calculateEMI(principal, annualRate, months) {
  if (annualRate === 0) return principal / months;
  const r = annualRate / 12 / 100;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

export function buildSchedule(principal, annualRate, months, startDate, emiAmount) {
  const r = annualRate / 12 / 100;
  const rows = [];
  let balance = Number(principal);
  const start = new Date(startDate);

  for (let i = 1; i <= months; i++) {
    const interest = balance * r;
    const principalPart = Math.max(0, Number(emiAmount) - interest);
    const closing = Math.max(0, balance - principalPart);
    const due = new Date(start);
    due.setMonth(due.getMonth() + i);

    rows.push({
      month: i,
      dueDate: due,
      emi: Number(emiAmount),
      principal: principalPart,
      interest,
      opening: balance,
      closing,
    });

    balance = closing;
  }

  return rows;
}

export function remainingBalance(schedule, paidMonths) {
  const paid = new Set(paidMonths);
  // Find the last paid row and return its closing balance, or principal if none paid
  let balance = schedule.length > 0 ? schedule[0].opening : 0;
  for (const row of schedule) {
    if (paid.has(row.month)) balance = row.closing;
  }
  return balance;
}
