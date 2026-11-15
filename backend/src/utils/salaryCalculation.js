const calculateSlip = (data) => {
  const salaryType = data.salaryType || "FIXED";

  const dispatchAmountUSD = Number(data.dispatchAmountUSD || 0);
  const commissionPercent = Number(data.commissionPercent || 0);
  const usdRate = Number(data.usdRate || 0);
  const fixedSalaryPKR = Number(data.fixedSalaryPKR || 0);

  const loanDeduction = Number(data.loanDeduction || 0);
  const advanceDeduction = Number(data.advanceDeduction || 0);
  const otherDeduction = Number(data.otherDeduction || 0);
  const bonus = Number(data.bonus || 0);

  let employeeShareUSD = 0;
  let grossSalaryPKR = 0;

  if (["COMMISSION", "FIXED_COMMISSION"].includes(salaryType)) {
    employeeShareUSD = (dispatchAmountUSD * commissionPercent) / 100;
    grossSalaryPKR = employeeShareUSD * usdRate;
  }

  if (["FIXED", "FIXED_COMMISSION"].includes(salaryType)) {
    grossSalaryPKR += fixedSalaryPKR;
  }

  const netSalaryPKR =
    grossSalaryPKR + bonus - loanDeduction - advanceDeduction - otherDeduction;

  return {
    employeeShareUSD,
    grossSalaryPKR,
    netSalaryPKR
  };
};

module.exports = { calculateSlip };
