/**
 * Compensation calculation logic for "Roar of the Lion" (שאגת הארי)
 * Damage period: March–April 2026 vs. March–April 2025
 */

// ─── Constants ───────────────────────────────────────────────────────────────
export const MIN_ANNUAL_REVENUE = 12000;
export const MID_RANGE_THRESHOLD = 300000;
export const MAX_ANNUAL_REVENUE = 400_000_000;
export const MAX_GROSS_SALARY = 13769;

// ─── Steps ────────────────────────────────────────────────────────────────────
export const STEPS_FULL = [
  { id: "welcome",              label: "פתיחה" },
  { id: "business_active",      label: "סטטוס עסק" },
  { id: "business_type",        label: "סוג עסק" },
  { id: "annual_revenue",       label: "מחזור שנתי" },
  { id: "base_revenue",         label: "הכנסות בסיס" },
  { id: "compensation_revenue", label: "הכנסות פיצוי" },
  { id: "monthly_expenses",     label: "הוצאות חודשיות" },
  { id: "monthly_salary",       label: "עלות שכר" },
  { id: "result",               label: "תוצאה" },
];

export const STEPS_MID = [
  { id: "welcome",              label: "פתיחה" },
  { id: "business_active",      label: "סטטוס עסק" },
  { id: "business_type",        label: "סוג עסק" },
  { id: "annual_revenue",       label: "מחזור שנתי" },
  { id: "base_revenue",         label: "הכנסות בסיס" },
  { id: "compensation_revenue", label: "הכנסות פיצוי" },
  { id: "result",               label: "תוצאה" },
];

export const STEPS_SHORT = [
  { id: "welcome",         label: "פתיחה" },
  { id: "business_active", label: "סטטוס עסק" },
  { id: "business_type",   label: "סוג עסק" },
  { id: "annual_revenue",  label: "מחזור שנתי" },
  { id: "result",          label: "תוצאה" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatCurrency(num) {
  return new Intl.NumberFormat('he-IL').format(Math.round(num));
}

export function calculateDecline(baseRevenue, compensationRevenue) {
  if (!baseRevenue || baseRevenue <= 0) return 0;
  const decline = ((baseRevenue - compensationRevenue) / baseRevenue) * 100;
  return Math.round(decline * 10) / 10;
}

export function getDeclineRangeLabel(declinePercent) {
  if (declinePercent < 25) return "פחות מ-25%";
  if (declinePercent < 40) return "25%–40%";
  if (declinePercent < 60) return "40%–60%";
  if (declinePercent < 80) return "60%–80%";
  return "80%–100%";
}

// ─── Expense coefficient (large business) ────────────────────────────────────
export function getFixedCostsCoefficient(declinePercent) {
  if (declinePercent < 25) return 0;
  if (declinePercent <= 40) return 0.07;
  if (declinePercent <= 60) return 0.11;
  if (declinePercent <= 80) return 0.15;
  return 0.22;
}

// ─── Monthly cap by annual revenue ───────────────────────────────────────────
export function getMonthlyCapByRevenue(annualRevenue) {
  if (annualRevenue <= 100_000_000) return 600_000;
  if (annualRevenue <= 300_000_000) return 600_000 + (annualRevenue - 100_000_000) * 0.003;
  return 1_200_000;
}

// ─── Small business table ─────────────────────────────────────────────────────
const MID_RANGE_TABLE = [
  { max: 50000,  base: 1864  },
  { max: 90000,  base: 3356  },
  { max: 120000, base: 4475  },
  { max: 150000, base: 2823  },
  { max: 200000, base: 3329  },
  { max: 250000, base: 4261  },
  { max: 300000, base: 4980  },
];

export function getMidRangeBaseCompensation(annualRevenue) {
  for (const row of MID_RANGE_TABLE) {
    if (annualRevenue <= row.max) return row.base;
  }
  return MID_RANGE_TABLE[MID_RANGE_TABLE.length - 1].base;
}

export function getDamageCoefficient(declinePercent) {
  if (declinePercent < 25) return 0;
  if (declinePercent <= 40) return 1;
  if (declinePercent <= 60) return 1.5;
  if (declinePercent <= 80) return 2.4;
  return 3;
}

// ─── Main calculation ─────────────────────────────────────────────────────────

/**
 * @param {object} input
 * @param {string}  input.businessType
 * @param {number}  input.annualRevenue2025
 * @param {number}  input.monthlyExpenses2025       - ממוצע הוצאות חודשיות
 * @param {number}  input.revenueMarchApril2025
 * @param {number}  input.revenueMarchApril2026
 * @param {number}  input.grossSalaryMarch2026
 * @param {number}  [input.fixedExpensesActual]     - אופציונלי
 * @param {boolean} [input.hasDirectDamage]
 */
export function calculateFullCompensation(input) {
  const {
    businessType,
    annualRevenue2025,
    monthlyExpenses2025,
    revenueMarchApril2025,
    revenueMarchApril2026,
    grossSalaryMarch2026,
    fixedExpensesActual,
    hasDirectDamage,
  } = input;

  const notes = [];

  // Step 1: decline %
  const declinePercent = calculateDecline(revenueMarchApril2025, revenueMarchApril2026);

  // Step 2: eligibility
  if (annualRevenue2025 < MIN_ANNUAL_REVENUE) {
    return { eligible: false, declinePercent, notes: ["המחזור השנתי נמוך מהסף המינימלי (12,000 ₪)"] };
  }
  if (annualRevenue2025 > MAX_ANNUAL_REVENUE) {
    return { eligible: false, declinePercent, notes: ["המחזור השנתי עולה על התקרה המקסימלית (400 מיליון ₪)"] };
  }
  if (declinePercent < 25) {
    return { eligible: false, declinePercent, notes: ["ירידת ההכנסות נמוכה מ-25% — הסף המינימלי לזכאות"] };
  }

  // ── SMALL BUSINESS (< 300,000) ────────────────────────────────────────────
  if (annualRevenue2025 < MID_RANGE_THRESHOLD) {
    const baseAmount = getMidRangeBaseCompensation(annualRevenue2025);
    const coeff = annualRevenue2025 <= 120000 ? 1 : getDamageCoefficient(declinePercent);
    const compensationAmount = Math.round(baseAmount * coeff);

    return {
      eligible: true,
      declinePercent,
      businessCategory: "small",
      baseAmount,
      damageCoefficient: coeff,
      compensationAmount,
      finalCompensation: compensationAmount,
      additionalDirectDamage: 0,
      notes,
    };
  }

  // ── LARGE BUSINESS (300k–400M) ────────────────────────────────────────────
  const expenseCoeff = getFixedCostsCoefficient(declinePercent);

  // Component 1: expenses
  let expenseComponent = monthlyExpenses2025 * expenseCoeff;

  if (fixedExpensesActual && fixedExpensesActual > expenseComponent) {
    const doubled = monthlyExpenses2025 * expenseCoeff * 2;
    const enhanced = Math.min(doubled, fixedExpensesActual);
    if (enhanced > expenseComponent) {
      notes.push("רכיב התשומות הוגדל בשל הוצאות בפועל גבוהות");
      expenseComponent = enhanced;
    }
  }

  // Component 2: salary
  const cappedSalary = Math.min(grossSalaryMarch2026, MAX_GROSS_SALARY);
  const employerCost = cappedSalary * 1.25;
  const salaryComponent = employerCost * (declinePercent / 100) * 0.75;

  const subtotalBeforeCap = expenseComponent + salaryComponent;

  // Cap
  const monthlyCapApplied = getMonthlyCapByRevenue(annualRevenue2025);
  let compensationAmount = Math.min(subtotalBeforeCap, monthlyCapApplied);
  if (subtotalBeforeCap > monthlyCapApplied) {
    notes.push(`הפיצוי הוגבל לתקרה החודשית (${formatCurrency(monthlyCapApplied)} ₪)`);
  }

  // Compare with small business equivalent
  const smallBase = getMidRangeBaseCompensation(Math.min(annualRevenue2025, 300000));
  const smallCoeff = getDamageCoefficient(declinePercent);
  const smallEquivalent = Math.round(smallBase * smallCoeff);
  if (smallEquivalent > compensationAmount) {
    compensationAmount = smallEquivalent;
    notes.push("הפיצוי חושב לפי נוסחת עסק קטן (הניבה תוצאה גבוהה יותר)");
  }

  // Additional: direct damage for sole proprietors
  let additionalDirectDamage = 0;
  if (hasDirectDamage && businessType === "עוסק יחיד") {
    const additional = Math.min((annualRevenue2025 / 6) * (declinePercent / 100), 30000);
    additionalDirectDamage = Math.round(additional);
    notes.push(`נוסף פיצוי נזק ישיר לעוסק יחיד: ${formatCurrency(additionalDirectDamage)} ₪`);
  }

  const finalCompensation = Math.round(compensationAmount + additionalDirectDamage);

  return {
    eligible: true,
    declinePercent,
    businessCategory: "large",
    expenseComponent: Math.round(expenseComponent),
    expenseCoefficient: expenseCoeff,
    salaryComponent: Math.round(salaryComponent),
    subtotalBeforeCap: Math.round(subtotalBeforeCap),
    monthlyCapApplied: Math.round(monthlyCapApplied),
    compensationAmount: Math.round(compensationAmount),
    additionalDirectDamage,
    finalCompensation,
    notes,
  };
}

// ─── Legacy helpers (still used in ResultCard / StepIndicator) ────────────────
export function calculateCompensation(declinePercent, annualExpenses2025, grossSalaryMarch2026, annualRevenue) {
  const monthlyExpenses = annualExpenses2025 / 12;
  return calculateFullCompensation({
    businessType: "",
    annualRevenue2025: annualRevenue,
    monthlyExpenses2025: monthlyExpenses,
    revenueMarchApril2025: 100,
    revenueMarchApril2026: 100 - declinePercent,
    grossSalaryMarch2026,
  });
}

export function calculateMidRangeCompensation(annualRevenue, declinePercent) {
  if (declinePercent < 25) return { 
    eligible: false, 
    baseAmount: 0, 
    damageCoefficient: 0, 
    totalAmount: 0 
  };
  const coeff = annualRevenue <= 120000 ? 1 : getDamageCoefficient(declinePercent);
  const base = getMidRangeBaseCompensation(annualRevenue);
  return {
    eligible: true,
    baseAmount: base,
    damageCoefficient: coeff,
    totalAmount: Math.round(base * coeff),
  };
}
