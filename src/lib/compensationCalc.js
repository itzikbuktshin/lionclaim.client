/**
 * Compensation calculation logic for "Roar of the Lion" (שאגת הארי)
 * For businesses with annual revenue between 300,000 and 400 million NIS
 * Damage period: March–April 2026 vs. March–April 2025
 */

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

/**
 * Calculate total monthly compensation:
 * Fixed costs component: monthlyExpenses × coefficient
 * Salary component: monthlySalary × declineRate × 1.25
 * 
 * @param {number} declinePercent - revenue decline %
 * @param {number} monthlyExpenses - average monthly fixed expenses (NIS)
 * @param {number} monthlySalary - monthly salary costs (NIS)
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

// Steps definition
export const STEPS = [
  { id: "welcome", label: "פתיחה" },
  { id: "business_active", label: "סטטוס עסק" },
  { id: "business_type", label: "סוג עסק" },
  { id: "annual_revenue", label: "מחזור שנתי" },
  { id: "base_revenue", label: "הכנסות בסיס" },
  { id: "compensation_revenue", label: "הכנסות פיצוי" },
  { id: "monthly_expenses", label: "הוצאות קבועות" },
  { id: "monthly_salary", label: "עלות שכר" },
  { id: "result", label: "תוצאה" },
];