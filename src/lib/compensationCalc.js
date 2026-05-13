/**
 * Compensation calculation logic for "Roar of the Lion" (שאגת הארי)
 * Indirect war damage compensation for businesses
 */

// Damage coefficient based on revenue decline percentage
export function getDamageCoefficient(declinePercent) {
  if (declinePercent < 25) return 0;
  if (declinePercent <= 40) return 1;
  if (declinePercent <= 60) return 1.5;
  if (declinePercent <= 80) return 2.4;
  return 3;
}

export function getDamageCoefficientLabel(declinePercent) {
  if (declinePercent < 25) return "אין זכאות";
  if (declinePercent <= 40) return "25%-40%";
  if (declinePercent <= 60) return "40%-60%";
  if (declinePercent <= 80) return "60%-80%";
  return "מעל 80%";
}

// Compensation tiers based on annual gross revenue (base year)
export function calculateCompensation(annualRevenue, declinePercent) {
  const coefficient = getDamageCoefficient(declinePercent);
  
  if (coefficient === 0) {
    return { eligible: false, amount: 0, tier: null, coefficient: 0 };
  }

  let amount = 0;
  let tier = "";

  if (annualRevenue <= 50000) {
    amount = 1864;
    tier = "עד 50,000 ₪";
  } else if (annualRevenue <= 90000) {
    amount = 3356;
    tier = "50,001 - 90,000 ₪";
  } else if (annualRevenue <= 120000) {
    amount = 4475;
    tier = "90,001 - 120,000 ₪";
  } else if (annualRevenue <= 150000) {
    amount = Math.round(2823 * coefficient);
    tier = "120,001 - 150,000 ₪";
  } else if (annualRevenue <= 200000) {
    amount = Math.round(3329 * coefficient);
    tier = "150,001 - 200,000 ₪";
  } else if (annualRevenue <= 250000) {
    amount = Math.round(4261 * coefficient);
    tier = "200,001 - 250,000 ₪";
  } else if (annualRevenue <= 300000) {
    amount = Math.round(4980 * coefficient);
    tier = "250,001 - 300,000 ₪";
  } else {
    amount = Math.round(4980 * coefficient);
    tier = "מעל 300,000 ₪";
  }

  return { eligible: true, amount, tier, coefficient };
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
  { id: "annual_revenue", label: "הכנסות שנתיות" },
  { id: "base_revenue", label: "הכנסות בסיס" },
  { id: "compensation_revenue", label: "הכנסות פיצוי" },
  { id: "result", label: "תוצאה" }
];