import React, { useState, useRef, useEffect, useCallback } from "react";
import { Shield, RotateCcw, X, Info, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatMessage from "@/components/chat/ChatMessage";
import ChatInput from "@/components/chat/ChatInput";
import StepIndicator from "@/components/chat/StepIndicator";
import ResultCard from "@/components/chat/ResultCard";
import TypingIndicator from "@/components/chat/TypingIndicator";
import {
  calculateFullCompensation,
  formatCurrency, STEPS_MID, STEPS_SHORT,
  MIN_ANNUAL_REVENUE, MID_RANGE_THRESHOLD
} from "@/lib/compensationCalc";
import { base44 } from "@/api/base44Client";

const INITIAL_MESSAGE = "שלום! 👋\nאני הסוכן לבדיקת זכאות לפיצויים עקיפים במסלול \"שאגת הארי\".\nאעזור לך לבדוק אם העסק שלך זכאי לפיצוי ומה הסכום החודשי המשוער.\n\nנתחיל?";

// Steps for large business (now includes direct-damage question)
const STEPS_LARGE = [
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

export default function Home() {
  const [messages, setMessages] = useState([{ text: INITIAL_MESSAGE, isAgent: true }]);
  const [step, setStep] = useState("welcome");
  const [showPrivacyBanner, setShowPrivacyBanner] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [activeSteps, setActiveSteps] = useState(STEPS_LARGE);
  const [data, setData] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const [result, setResult] = useState(null);
  const [savedCheckId, setSavedCheckId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const addMessages = useCallback((userMsg, agentMsg, nextStep, nextStepIndex, newData) => {
    setMessages(prev => [...prev, { text: userMsg, isAgent: false }]);
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { text: agentMsg, isAgent: true }]);
      if (nextStep) setStep(nextStep);
      if (nextStepIndex !== undefined) setStepIndex(nextStepIndex);
      if (newData) setData(prev => ({ ...prev, ...newData }));
    }, 600);
  }, []);

  const finishAndCalc = useCallback((finalData) => {
    const calc = calculateFullCompensation({
      businessType: finalData.businessType,
      annualRevenue2025: finalData.annualRevenue,
      monthlyExpenses2025: finalData.monthlyExpenses,
      revenueMarchApril2025: finalData.baseRevenue,
      revenueMarchApril2026: finalData.compensationRevenue,
      grossSalaryMarch2026: finalData.grossSalary,
      fixedExpensesActual: finalData.fixedExpensesActual,
    });

    setMessages(prev => [...prev, { text: "מחשב את הזכאות שלך... 📊", isAgent: true }]);

    base44.entities.EligibilityCheck.create({
      business_type: finalData.businessType,
      annual_revenue: finalData.annualRevenue,
      base_revenue: finalData.baseRevenue,
      compensation_revenue: finalData.compensationRevenue,
      monthly_expenses: finalData.monthlyExpenses,
      monthly_salary: finalData.grossSalary,
      decline_percent: calc.declinePercent,
      eligible: calc.eligible,
      compensation_amount: calc.finalCompensation || calc.compensationAmount || 0,
      createdAt: new Date().toISOString(),
    }).then(record => { if (record?.id) setSavedCheckId(record.id); });

    setTimeout(() => {
      setResult(calc);
      setStep("result");
      setStepIndex(STEPS_LARGE.length - 1);
    }, 800);
  }, []);

  const handleSend = useCallback((value) => {
    switch (step) {
      case "welcome": {
        addMessages("כן, בוא נתחיל", "מצוין! 🏢\nהאם העסק שלך היה פעיל בשנת 2025?", "business_active", 1);
        break;
      }

      case "business_active": {
        if (value === "yes") {
          addMessages("כן, העסק היה פעיל", "מה סוג העסק שלך?", "business_type", 2, { businessActive: true });
        } else {
          addMessages(
            "לא, העסק לא היה פעיל",
            "לצערי, רק עסקים שהיו פעילים לפני סוף פברואר 2026 זכאים לפיצוי במסלול זה. 😔",
            "done", 0, { businessActive: false }
          );
        }
        break;
      }

      case "business_type": {
        if (!value) return;
        addMessages(value, "מהו המחזור השנתי של העסק בשנת 2025? (בשקלים)\nלדוגמה: 500000", "annual_revenue", 3, { businessType: value });
        break;
      }

      case "annual_revenue": {
        const num = parseFloat(value.replace(/,/g, ""));
        if (isNaN(num) || num <= 0) {
          setMessages(prev => [...prev, { text: value, isAgent: false }]);
          setIsTyping(true);
          setTimeout(() => { setIsTyping(false); setMessages(prev => [...prev, { text: "אנא הזן מספר תקין (למשל: 500000)", isAgent: true }]); }, 400);
          return;
        }
        if (num < MIN_ANNUAL_REVENUE) {
          setActiveSteps(STEPS_SHORT);
          addMessages(`${formatCurrency(num)} ₪`,
            `לצערי, מסלול שאגת הארי מיועד לעסקים עם מחזור שנתי של ${formatCurrency(MIN_ANNUAL_REVENUE)} ₪ ומעלה.\nהמחזור שהזנת (${formatCurrency(num)} ₪) נמוך מהסף הנדרש.\n\nמומלץ לפנות לרשות המיסים לבדיקת מסלולים חלופיים.`,
            "done", 4, { annualRevenue: num }
          );
          break;
        }
        if (num < MID_RANGE_THRESHOLD) {
          setActiveSteps(STEPS_MID);
        } else {
          setActiveSteps(STEPS_LARGE);
        }
        addMessages(`${formatCurrency(num)} ₪`, "מהן ההכנסות ברוטו בתקופת הבסיס — מרץ-אפריל 2025? (בשקלים)", "base_revenue", 4, { annualRevenue: num });
        break;
      }

      case "base_revenue": {
        const num = parseFloat(value.replace(/,/g, ""));
        if (isNaN(num) || num <= 0) {
          setMessages(prev => [...prev, { text: value, isAgent: false }]);
          setIsTyping(true);
          setTimeout(() => { setIsTyping(false); setMessages(prev => [...prev, { text: "אנא הזן מספר תקין (למשל: 80000)", isAgent: true }]); }, 400);
          return;
        }
        addMessages(`${formatCurrency(num)} ₪`, "מהן ההכנסות ברוטו בתקופת הפיצוי — מרץ-אפריל 2026? (בשקלים)\nניתן להזין 0.", "compensation_revenue", 5, { baseRevenue: num });
        break;
      }

      case "compensation_revenue": {
        const num = parseFloat(value.replace(/,/g, ""));
        if (isNaN(num) || num < 0) {
          setMessages(prev => [...prev, { text: value, isAgent: false }]);
          setIsTyping(true);
          setTimeout(() => { setIsTyping(false); setMessages(prev => [...prev, { text: "אנא הזן מספר תקין (למשל: 40000). ניתן להזין 0.", isAgent: true }]); }, 400);
          return;
        }

        // Mid-range: skip salary/expenses steps
        if (data.annualRevenue < MID_RANGE_THRESHOLD) {
          setMessages(prev => [...prev, { text: `${formatCurrency(num)} ₪`, isAgent: false }]);
          setIsTyping(true);
          setTimeout(() => {
            setIsTyping(false);
            const updatedData = { ...data, compensationRevenue: num, monthlyExpenses: 0, grossSalary: 0 };
            setData(updatedData);
            finishAndCalc(updatedData);
          }, 600);
          return;
        }

        addMessages(`${formatCurrency(num)} ₪`,
          "מה סך ההוצאות השנתיות של העסק בשנת 2025? (שכירות, חשמל, ביטוחים וכו׳)\nבשקלים — למשל: 240000",
          "monthly_expenses", 6, { compensationRevenue: num }
        );
        break;
      }

      case "monthly_expenses": {
        const num = parseFloat(value.replace(/,/g, ""));
        if (isNaN(num) || num < 0) {
          setMessages(prev => [...prev, { text: value, isAgent: false }]);
          setIsTyping(true);
          setTimeout(() => { setIsTyping(false); setMessages(prev => [...prev, { text: "אנא הזן מספר תקין (למשל: 240000). ניתן להזין 0.", isAgent: true }]); }, 400);
          return;
        }
        addMessages(`${formatCurrency(num)} ₪`,
          "מה שכר הברוטו הכולל של העובדים בחודש מרץ 2026? (בשקלים)\nתקרת החישוב לעובד: 13,769 ₪. אם אין עובדים, הזן 0.\nאין לכלול עובדים בחופשה / מילואים / חל\"ת.",
          "monthly_salary", 7, { monthlyExpenses: num / 12 }
        );
        break;
      }

      case "monthly_salary": {
        const num = parseFloat(value.replace(/,/g, ""));
        if (isNaN(num) || num < 0) {
          setMessages(prev => [...prev, { text: value, isAgent: false }]);
          setIsTyping(true);
          setTimeout(() => { setIsTyping(false); setMessages(prev => [...prev, { text: "אנא הזן מספר תקין (למשל: 50000). ניתן להזין 0.", isAgent: true }]); }, 400);
          return;
        }
        setMessages(prev => [...prev, { text: `${formatCurrency(num)} ₪`, isAgent: false }]);
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setMessages(prev => [...prev, { text: "מחשב את הזכאות שלך... 📊", isAgent: true }]);
          const updatedData = { ...data, grossSalary: num };
          setData(updatedData);
          finishAndCalc(updatedData);
        }, 600);
        break;
      }

      default:
        break;
    }
  }, [step, data, addMessages, finishAndCalc]);

  const handleReset = () => {
    setMessages([{ text: INITIAL_MESSAGE, isAgent: true }]);
    setStep("welcome");
    setStepIndex(0);
    setActiveSteps(STEPS_LARGE);
    setData({});
    setResult(null);
    setSavedCheckId(null);
    setDeleteConfirm(false);
    setIsTyping(false);
  };

  const handleDeleteRecord = async () => {
    if (!savedCheckId) return;
    await base44.entities.EligibilityCheck.delete(savedCheckId);
    setSavedCheckId(null);
    setDeleteConfirm(false);
  };

  const getInputConfig = () => {
    switch (step) {
      case "welcome":
        return { options: [{ label: "כן, בוא נתחיל ✨", value: "start" }] };
      case "business_active":
        return { options: [{ label: "כן ✅", value: "yes" }, { label: "לא ❌", value: "no" }] };
      case "business_type":
        return { options: [
          { label: "עוסק יחיד", value: "עוסק יחיד" },
          { label: "עוסק מורשה", value: "עוסק מורשה" },
          { label: "עוסק פטור", value: "עוסק פטור" },
          { label: "חברה בע\"מ", value: "חברה בע\"מ" },
          { label: "שותפות", value: "שותפות" },
        ]};
      case "annual_revenue":      return { placeholder: "למשל: 500000", type: "text" };
      case "base_revenue":        return { placeholder: "הכנסות מרץ-אפריל 2025 (₪)", type: "text" };
      case "compensation_revenue":return { placeholder: "הכנסות מרץ-אפריל 2026 (₪)", type: "text" };
      case "monthly_expenses":    return { placeholder: "סך הוצאות שנתיות 2025 (₪)", type: "text" };
      case "monthly_salary":      return { placeholder: "שכר ברוטו כולל מרץ 2026 (₪)", type: "text" };

      default:
        return null;
    }
  };

  const inputConfig = getInputConfig();

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden" dir="rtl">
      {/* Header */}
      <header className="bg-primary text-primary-foreground flex-shrink-0">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden">
              <img src="https://media.base44.com/images/public/6a04c6b537453feadf05323e/b1b1bfb94_e8d1258de_logo.png" alt="לוגו" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">בדיקת זכאות — שאגת הארי</h1>
              <p className="text-xs opacity-70">פיצויים עקיפים לעסקים בעקבות נזקי מלחמה</p>
            </div>
          </div>
          {step !== "welcome" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReset}
              className="text-primary-foreground hover:bg-primary-foreground/10 rounded-full"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </header>

      {/* Privacy Banner */}
      {showPrivacyBanner && (
        <div className="bg-accent border-b border-border flex-shrink-0">
          <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="w-3.5 h-3.5 flex-shrink-0 text-primary/60" />
              <span>החישובים בלבד נשמרים לצורך מחקר — ללא פרטים מזהים</span>
            </div>
            <button onClick={() => setShowPrivacyBanner(false)} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0" aria-label="סגור">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Step Indicator */}
      <div className="bg-card border-b border-border flex-shrink-0">
        <div className="max-w-2xl mx-auto">
          <StepIndicator currentStepIndex={stepIndex} steps={activeSteps} />
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 min-h-0 flex flex-col max-w-2xl mx-auto w-full">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.map((msg, i) => (
            <ChatMessage key={i} message={msg.text} isAgent={msg.isAgent} />
          ))}
          {isTyping && <TypingIndicator />}
          {result && (
            <div className="pt-2">
              <ResultCard result={result} />
            </div>
          )}
        </div>

        {/* Input Area */}
        {inputConfig && !result && (
          <div className="flex-shrink-0 border-t border-border bg-background" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
            {step === "welcome" ? (
              <div className="p-4 flex justify-center">
                <button
                  onClick={() => handleSend("start")}
                  className="w-full max-w-xs rounded-2xl px-8 py-4 text-base font-bold text-primary-foreground shadow-lg transition-all duration-200 active:scale-95 hover:brightness-110"
                  style={{ background: "linear-gradient(135deg, hsl(42,87%,50%) 0%, hsl(30,90%,55%) 100%)" }}
                >
                   התחל עכשיו
                </button>
              </div>
            ) : inputConfig.options ? (
              <ChatInput options={inputConfig.options} onSend={handleSend} />
            ) : (
              <ChatInput onSend={handleSend} placeholder={inputConfig.placeholder} type={inputConfig.type} disabled={isTyping} />
            )}
          </div>
        )}

        {/* Reset after result */}
        {result && (
          <div className="p-4 border-t border-border flex items-center justify-between">
            <div className="flex-1" />
            <Button onClick={handleReset} variant="outline" className="rounded-full gap-2">
              <RotateCcw className="w-4 h-4" />
              התחל מחדש
            </Button>
            {savedCheckId && (
              <div className="flex-1 flex justify-end">
                {deleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">למחוק את הנתונים?</span>
                    <button onClick={handleDeleteRecord} className="text-xs text-destructive hover:underline">כן</button>
                    <button onClick={() => setDeleteConfirm(false)} className="text-xs text-muted-foreground hover:underline">ביטול</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirm(true)} className="text-muted-foreground/40 hover:text-muted-foreground transition-colors p-1" title="מחק את הנתונים שנשמרו">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}