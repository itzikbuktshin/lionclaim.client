import React, { useState, useRef, useEffect, useCallback } from "react";
import { Shield, RotateCcw, X, Info, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatMessage from "@/components/chat/ChatMessage";
import ChatInput from "@/components/chat/ChatInput";
import StepIndicator from "@/components/chat/StepIndicator";
import ResultCard from "@/components/chat/ResultCard";
import TypingIndicator from "@/components/chat/TypingIndicator";
import { calculateCompensation, calculateDecline, getDamageCoefficient, formatCurrency } from "@/lib/compensationCalc";
import { base44 } from "@/api/base44Client";

const INITIAL_MESSAGE = "שלום! 👋\nאני הסוכן לבדיקת זכאות לפיצויים עקיפים במסלול \"שאגת הארי\".\nאעזור לך לבדוק אם העסק שלך זכאי לפיצוי ומה הסכום המשוער.\n\nנתחיל?";

export default function Home() {
  const [messages, setMessages] = useState([
    { text: INITIAL_MESSAGE, isAgent: true }
  ]);
  const [step, setStep] = useState("welcome");
  const [showPrivacyBanner, setShowPrivacyBanner] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
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

  const handleSend = useCallback((value) => {
    switch (step) {
      case "welcome": {
        addMessages(
          "כן, בוא נתחיל",
          "מצוין! 🏢\nהאם העסק שלך היה פעיל בשנת 2025?",
          "business_active", 1
        );
        break;
      }

      case "business_active": {
        if (value === "yes") {
          addMessages(
            "כן, העסק היה פעיל",
            "מה סוג העסק שלך?",
            "business_type", 2, { businessActive: true }
          );
        } else {
          addMessages(
            "לא, העסק לא היה פעיל",
            "לצערי, רק עסקים שהיו פעילים בשנת 2025 זכאים לפיצוי במסלול זה. 😔\nאם יש לך שאלות נוספות, אתה מוזמן להתחיל שיחה חדשה.",
            "done", 0, { businessActive: false }
          );
        }
        break;
      }

      case "business_type": {
        if (!value) return;
        addMessages(
          value,
          "מהן ההכנסות ברוטו השנתיות של העסק בשנת 2025? (בשקלים)",
          "annual_revenue", 3, { businessType: value }
        );
        break;
      }

      case "annual_revenue": {
        const num = parseFloat(value.replace(/,/g, ""));
        if (isNaN(num) || num <= 0) {
          setMessages(prev => [...prev, 
            { text: value, isAgent: false },
          ]);
          setIsTyping(true);
          setTimeout(() => {
            setIsTyping(false);
            setMessages(prev => [...prev, 
              { text: "אנא הזן מספר תקין (למשל: 120000)", isAgent: true }
            ]);
          }, 400);
          return;
        }
        addMessages(
          `${formatCurrency(num)} ₪`,
          `תודה. כעת אני צריך את הכנסות תקופת הבסיס.\nמהן ההכנסות ברוטו שלך בתקופה מרץ-אפריל 2025? (בשקלים)`,
          "base_revenue", 4, { annualRevenue: num }
        );
        break;
      }

      case "base_revenue": {
        const num = parseFloat(value.replace(/,/g, ""));
        if (isNaN(num) || num <= 0) {
          setMessages(prev => [...prev, { text: value, isAgent: false }]);
          setIsTyping(true);
          setTimeout(() => {
            setIsTyping(false);
            setMessages(prev => [...prev, 
              { text: "אנא הזן מספר תקין (למשל: 30000)", isAgent: true }
            ]);
          }, 400);
          return;
        }
        addMessages(
          `${formatCurrency(num)} ₪`,
          "ומהן ההכנסות ברוטו בתקופת הפיצוי (התקופה המקבילה בזמן הנזק)? (בשקלים)",
          "compensation_revenue", 5, { baseRevenue: num }
        );
        break;
      }

      case "compensation_revenue": {
        const num = parseFloat(value.replace(/,/g, ""));
        if (isNaN(num) || num < 0) {
          setMessages(prev => [...prev, { text: value, isAgent: false }]);
          setIsTyping(true);
          setTimeout(() => {
            setIsTyping(false);
            setMessages(prev => [...prev, 
              { text: "אנא הזן מספר תקין (למשל: 15000). ניתן להזין 0.", isAgent: true }
            ]);
          }, 400);
          return;
        }

        const updatedData = { ...data, compensationRevenue: num };
        const declinePercent = calculateDecline(updatedData.baseRevenue, num);
        const compensation = calculateCompensation(updatedData.annualRevenue, declinePercent);
        const coefficient = getDamageCoefficient(declinePercent);

        const resultData = {
          eligible: compensation.eligible,
          declinePercent,
          coefficient,
          amount: compensation.amount,
          tier: compensation.tier,
          annualRevenue: updatedData.annualRevenue,
          businessType: updatedData.businessType,
        };

        setMessages(prev => [...prev, { text: `${formatCurrency(num)} ₪`, isAgent: false }]);
        setIsTyping(true);

        setTimeout(async () => {
          setIsTyping(false);
          setMessages(prev => [...prev, 
            { text: "מחשב את הזכאות שלך... 📊", isAgent: true }
          ]);

          // Save to DB
          base44.entities.EligibilityCheck.create({
            business_type: updatedData.businessType,
            annual_revenue: updatedData.annualRevenue,
            base_revenue: updatedData.baseRevenue,
            compensation_revenue: num,
            decline_percent: declinePercent,
            damage_coefficient: coefficient,
            eligible: compensation.eligible,
            compensation_amount: compensation.amount,
            compensation_tier: compensation.tier || null,
          }).then(record => {
            if (record?.id) setSavedCheckId(record.id);
          });

          setTimeout(() => {
            setResult(resultData);
            setStep("result");
            setStepIndex(6);
          }, 800);
        }, 600);
        break;
      }

      default:
        break;
    }
  }, [step, data, addMessages]);

  const handleReset = () => {
    setMessages([{ text: INITIAL_MESSAGE, isAgent: true }]);
    setStep("welcome");
    setStepIndex(0);
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
        return { options: [
          { label: "כן ✅", value: "yes" },
          { label: "לא ❌", value: "no" }
        ]};
      case "business_type":
        return { options: [
          { label: "עוסק מורשה", value: "עוסק מורשה" },
          { label: "עוסק פטור", value: "עוסק פטור" },
          { label: "חברה בע\"מ", value: "חברה בע\"מ" },
          { label: "שותפות", value: "שותפות" }
        ]};
      case "annual_revenue":
        return { placeholder: "למשל: 120000", type: "text" };
      case "base_revenue":
        return { placeholder: "הכנסות מרץ-אפריל 2025", type: "text" };
      case "compensation_revenue":
        return { placeholder: "הכנסות תקופת הפיצוי", type: "text" };
      default:
        return null;
    }
  };

  const inputConfig = getInputConfig();

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* Header */}
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
              <Shield className="w-5 h-5" />
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
        <div className="bg-accent border-b border-border">
          <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="w-3.5 h-3.5 flex-shrink-0 text-primary/60" />
              <span>החישובים בלבד נשמרים לצורך מחקר — ללא פרטים מזהים</span>
            </div>
            <button
              onClick={() => setShowPrivacyBanner(false)}
              className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              aria-label="סגור"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Step Indicator */}
      <div className="bg-card border-b border-border">
        <div className="max-w-2xl mx-auto">
          <StepIndicator currentStepIndex={stepIndex} />
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden flex flex-col max-w-2xl mx-auto w-full">
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
          <div className="border-t border-border">
            {inputConfig.options ? (
              <ChatInput options={inputConfig.options} onSend={handleSend} />
            ) : (
              <ChatInput 
                onSend={handleSend} 
                placeholder={inputConfig.placeholder} 
                type={inputConfig.type}
                disabled={isTyping}
              />
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
                    <button
                      onClick={handleDeleteRecord}
                      className="text-xs text-destructive hover:underline"
                    >כן</button>
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      className="text-xs text-muted-foreground hover:underline"
                    >ביטול</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="text-muted-foreground/40 hover:text-muted-foreground transition-colors p-1"
                    title="מחק את הנתונים שנשמרו"
                  >
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