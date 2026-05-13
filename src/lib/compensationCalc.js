/**
 * Compensation calculation logic for "Roar of the Lion" (שאגת הארי)
 * Damage period: March–April 2026 vs. March–April 2025
 */

// ─── Constants ───────────────────────────────────────────────────────────────
export const MIN_ANNUAL_REVENUE = 12000;
export const MID_RANGE_THRESHOLD = 300000;

// ─── Shared helpers ───────────────────────────────────────────────────────────

// Fixed costs compensation coefficient based on monthly revenue decline %
export function getFixedCostsCoefficient(declinePercent) {
  if (declinePercent < 25) return 0;
  if (declinePercent < 40) return 0.07;
  if (declinePercent < 60) return 0.11;
  if (declinePercent < 80) return 0.15;
  return 0.22;
}

export function getDeclineRangeLabel(declinePercent) {
  if (declinePercent < 25) return "אין זכאות";
  if (declinePercent < 40) return "25%–40%";
  if (declinePercent < 60) return "40%–60%";
  if (declinePercent < 80) return "60%–80%";
  return "80%–100%";
}

// Calculate revenue decline percentage
export function calculateDecline(baseRevenue, compensationRevenue) {
  if (baseRevenue <= 0) return 0;
  const decline = ((baseRevenue - compensationRevenue) / baseRevenue) * 100;
  return Math.round(decline * 10) / 10;
}

// Format number with commas
export function formatCurrency(num) {
  return new Intl.NumberFormat('he-IL').format(num);
}

// ─── HIGH revenue (≥ 300,000 NIS) ────────────────────────────────────────────
// Fixed costs component + salary component

/**
 * @param {number} declinePercent
 * @param {number} monthlyExpenses
 * @param {number} monthlySalary
 */
export function calculateCompensation(declinePercent, monthlyExpenses, monthlySalary) {
  const coefficient = getFixedCostsCoefficient(declinePercent);

  if (coefficient === 0) {
    return { eligible: false, fixedCostsAmount: 0, salaryAmount: 0, totalAmount: 0 };
  }

  const declineRate = declinePercent / 100;
  const fixedCostsAmount = Math.round(monthlyExpenses * coefficient);
  const salaryAmount = Math.round(monthlySalary * declineRate * 1.25);
  const totalAmount = fixedCostsAmount + salaryAmount;

  return { eligible: true, fixedCostsAmount, salaryAmount, totalAmount };
}

// ─── MID revenue (12,000–300,000 NIS) ────────────────────────────────────────
// Based on lookup table × damage coefficient

/**
 * Damage coefficient by decline range (mid-range businesses)
 */
export function getDamageCoefficient(declinePercent) {
  if (declinePercent < 25) return 0;
  if (declinePercent < 40) return 1;
  if (declinePercent < 60) return 1.5;
  if (declinePercent < 80) return 2.4;
  return 3;
}

/**
 * Base monthly compensation from table (annualRevenue in NIS)
 * Table values (NIS/month):
 *   up to 50,000       → 1,864
 *   50,001–90,000      → 3,356
 *   90,001–120,000     → 4,475
 *   120,001–150,000    → 2,823  (×2 damage)
 *   150,001–200,000    → 3,329  (×2 damage)
 *   200,001–250,000    → 4,261  (×2 damage)
 *   250,001–300,000    → 4,980  (×2 damage)
 */
const MID_RANGE_TABLE = [
  { max: 50000,  base: 1864,  doubleMultiplier: false },
  { max: 90000,  base: 3356,  doubleMultiplier: false },
  { max: 120000, base: 4475,  doubleMultiplier: false },
  { max: 150000, base: 2823,  doubleMultiplier: true  },
  { max: 200000, base: 3329,  doubleMultiplier: true  },
  { max: 250000, base: 4261,  doubleMultiplier: true  },
  { max: 300000, base: 4980,  doubleMultiplier: true  },
];

export function getMidRangeBaseCompensation(annualRevenue) {
  for (const row of MID_RANGE_TABLE) {
    if (annualRevenue <= row.max) return row;
  }
  return MID_RANGE_TABLE[MID_RANGE_TABLE.length - 1];
}

/**
 * @param {number} annualRevenue
 * @param {number} declinePercent
 */
export function calculateMidRangeCompensation(annualRevenue, declinePercent) {
  const coeff = getDamageCoefficient(declinePercent);

  if (coeff === 0) {
    return { eligible: false, baseAmount: 0, damageCoefficient: 0, totalAmount: 0 };
  }

  const row = getMidRangeBaseCompensation(annualRevenue);
  // For rows up to 120,000: base amount is fixed (no damage coefficient)
  // For rows above 120,000 (doubleMultiplier): base × damage coefficient
  const totalAmount = row.doubleMultiplier
    ? Math.round(row.base * coeff)
    : row.base;

  return {
    eligible: true,
    baseAmount: row.base,
    damageCoefficient: coeff,
    doubleMultiplier: row.doubleMultiplier,
    totalAmount,
  };
}

// ─── Steps ────────────────────────────────────────────────────────────────────

// Full flow: revenue ≥ 300,000 (fixed costs + salary)
export const STEPS_FULL = [
  { id: "welcome",              label: "פתיחה" },
  { id: "business_active",      label: "סטטוס עסק" },
  { id: "business_type",        label: "סוג עסק" },
  { id: "annual_revenue",       label: "מחזור שנתי" },
  { id: "base_revenue",         label: "הכנסות בסיס" },
  { id: "compensation_revenue", label: "הכנסות פיצוי" },
  { id: "monthly_expenses",     label: "הוצאות קבועות" },
  { id: "monthly_salary",       label: "עלות שכר" },
  { id: "result",               label: "תוצאה" },
];

// Mid flow: 12,000 ≤ revenue < 300,000 (table lookup)
export const STEPS_MID = [
  { id: "welcome",              label: "פתיחה" },
  { id: "business_active",      label: "סטטוס עסק" },
  { id: "business_type",        label: "סוג עסק" },
  { id: "annual_revenue",       label: "מחזור שנתי" },
  { id: "base_revenue",         label: "הכנסות בסיס" },
  { id: "compensation_revenue", label: "הכנסות פיצוי" },
  { id: "result",               label: "תוצאה" },
];

// Short flow: revenue < 12,000 → ineligible
export const STEPS_SHORT = [
  { id: "welcome",        label: "פתיחה" },
  { id: "business_active",label: "סטטוס עסק" },
  { id: "business_type",  label: "סוג עסק" },
  { id: "annual_revenue", label: "מחזור שנתי" },
  { id: "result",         label: "תוצאה" },
];