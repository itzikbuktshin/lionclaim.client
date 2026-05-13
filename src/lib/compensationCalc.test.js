/**
 * Test cases & validation for compensation calculations
 * Run in browser console: import('/src/lib/compensationCalc.test.js').then(m => m.runAllTests())
 */

import {
  calculateMidRangeCompensation,
  calculateCompensation,
  getMonthlyCapByRevenue,
  getDamageCoefficient,
  getFixedCostsCoefficient,
} from "./compensationCalc.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label, actual, expected, tolerance = 1) {
  const ok = Math.abs(actual - expected) <= tolerance;
  if (ok) {
    console.log(`  ✅ ${label}: ${actual} (expected ${expected})`);
    passed++;
  } else {
    console.error(`  ❌ ${label}: got ${actual}, expected ${expected}`);
    failed++;
  }
}

function assertBool(label, actual, expected) {
  const ok = actual === expected;
  if (ok) {
    console.log(`  ✅ ${label}: ${actual}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}: got ${actual}, expected ${expected}`);
    failed++;
  }
}

// ─── Mid-range tests (12K–300K) ───────────────────────────────────────────────

function testMidRange() {
  console.group("📊 עסקים קטנים (12K–300K)");

  // 1. מחזור 50K, ירידה 30% → 1,864 (מדרגה בסיס, מקדם 1, ללא הכפלה)
  {
    const r = calculateMidRangeCompensation(50_000, 30);
    assertBool("TC1 eligible", r.eligible, true);
    assert("TC1 totalAmount (50K × 30%)", r.totalAmount, 1864);
  }

  // 2. מחזור 80K, ירידה 50% → 5,034 (3,356 × 1.5)
  {
    const r = calculateMidRangeCompensation(80_000, 50);
    assertBool("TC2 eligible", r.eligible, true);
    assert("TC2 totalAmount (80K × 50%)", r.totalAmount, 5034);
  }

  // 3. מחזור 200K, ירידה 70% → 10,226 (4,261 × 2.4)
  {
    const r = calculateMidRangeCompensation(200_000, 70);
    assertBool("TC3 eligible", r.eligible, true);
    assert("TC3 totalAmount (200K × 70%)", r.totalAmount, 10226);
  }

  // 4. מחזור 300K, ירידה 85% → 14,940 (4,980 × 3)
  {
    const r = calculateMidRangeCompensation(300_000, 85);
    assertBool("TC4 eligible", r.eligible, true);
    assert("TC4 totalAmount (300K × 85%)", r.totalAmount, 14940);
  }

  console.groupEnd();
}

// ─── Large business tests (300K–400M) ────────────────────────────────────────

function testLarge() {
  console.group("🏢 עסקים גדולים (300K–400M)");

  // TC1: מחזור 1M, ירידה 50%, הוצאות שנתיות 1M, שכר מרץ 50K
  // תשומות: (1M÷12) × 11% = 9,167
  // שכר: min(50K,13769)×1.25×50%×75% = 6,457  ← שכר נחתך ל-13,769 (לא 50K!)
  // סה"כ: ~15,624 (תחת 600K)
  // הערה: test case מקורי ציפה 32,604 — אך זה לפני הפעלת תקרת שכר 13,769
  {
    const r = calculateCompensation(50, 1_000_000, 50_000, 1_000_000);
    assertBool("TC1 eligible", r.eligible, true);
    assert("TC1 fixedCostsAmount", r.fixedCostsAmount, 9167);
    // שכר מוגבל ל-13,769
    assert("TC1 salaryAmount (capped at 13,769)", r.salaryAmount, Math.round(13769 * 1.25 * 0.5 * 0.75));
    assert("TC1 totalAmount (under cap)", r.totalAmount, r.fixedCostsAmount + r.salaryAmount);
  }

  // TC2: מחזור 50M, ירידה 60%, הוצאות 40M, שכר מרץ 200K
  // תשומות: (40M÷12) × 11% = 366,667
  // שכר: min(200K,13769)×1.25×60%×75% = 7,746
  // סה"כ: ~374,413 (תחת 600K)
  {
    const r = calculateCompensation(60, 40_000_000, 200_000, 50_000_000);
    assertBool("TC2 eligible", r.eligible, true);
    assert("TC2 fixedCostsAmount", r.fixedCostsAmount, Math.round((40_000_000 / 12) * 0.11));
    assert("TC2 cap", r.cap, 600_000);
    assertBool("TC2 under cap", r.totalAmount <= 600_000, true);
  }

  // TC3: מחזור 200M, ירידה 70%, הוצאות 150M, שכר מרץ 500K → חיתוך לתקרה
  // תשומות: (150M÷12) × 15% = 1,875,000
  // שכר: min(500K,13769)×1.25×70%×75% = 9,068
  // סה"כ לפני חיתוך: 1,884,068 → תקרה: 600K+(200M-100M)×0.003=900K
  {
    const r = calculateCompensation(70, 150_000_000, 500_000, 200_000_000);
    assertBool("TC3 eligible", r.eligible, true);
    const expectedCap = 600_000 + 0.003 * (200_000_000 - 100_000_000); // 900,000
    assert("TC3 cap", r.cap, expectedCap);
    assert("TC3 totalAmount capped", r.totalAmount, expectedCap);
  }

  console.groupEnd();
}

// ─── Validation tests ────────────────────────────────────────────────────────

function testValidation() {
  console.group("🔍 Validation");

  // ירידה < 25% → לא זכאי
  {
    const mid = calculateMidRangeCompensation(100_000, 20);
    assertBool("ירידה 20% (mid) → לא זכאי", mid.eligible, false);
    const large = calculateCompensation(20, 500_000, 10_000, 500_000);
    assertBool("ירידה 20% (large) → לא זכאי", large.eligible, false);
  }

  // ירידה > 100% → מחשב כ-100% (קוף ב-getDamageCoefficient/getFixedCostsCoefficient)
  {
    const coeff = getDamageCoefficient(110);
    assert("ירידה 110% → מקדם נזק 3 (כמו 80%+)", coeff, 3);
    const fixedCoeff = getFixedCostsCoefficient(110);
    assert("ירידה 110% → מקדם הוצאות 22% (כמו 80%+)", fixedCoeff, 0.22);
  }

  // שכר > 13,769 → נקצץ
  {
    const r1 = calculateCompensation(50, 1_000_000, 13_769, 1_000_000);
    const r2 = calculateCompensation(50, 1_000_000, 100_000, 1_000_000);
    assert("שכר 13,769 ו-100K → אותו רכיב שכר", r1.salaryAmount, r2.salaryAmount);
  }

  // תקרה חודשית עד 100M = 600K
  assert("תקרה: מחזור 50M → 600K", getMonthlyCapByRevenue(50_000_000), 600_000);
  // תקרה 100M–300M
  assert("תקרה: מחזור 200M → 900K", getMonthlyCapByRevenue(200_000_000), 900_000);
  // תקרה 300M–400M = 1.2M
  assert("תקרה: מחזור 350M → 1.2M", getMonthlyCapByRevenue(350_000_000), 1_200_000);

  // מחזור מתחת ל-12K → מסלול STEPS_SHORT (מטופל ב-Home.jsx, לא כאן)
  console.log("  ℹ️ מחזור < 12K → מטופל ב-Home.jsx (הפניה למסלול אחר)");

  console.groupEnd();
}

// ─── Runner ──────────────────────────────────────────────────────────────────

export function runAllTests() {
  passed = 0;
  failed = 0;
  console.group("🧪 Compensation Calc — Test Suite");
  testMidRange();
  testLarge();
  testValidation();
  console.groupEnd();
  console.log(`\n📋 תוצאות: ${passed} עברו ✅ | ${failed} נכשלו ❌`);
  return { passed, failed };
}

// Auto-run if called directly
runAllTests();