import React from "react";
import { STEPS } from "@/lib/compensationCalc";
import { Check } from "lucide-react";

export default function StepIndicator({ currentStepIndex }) {
  const visibleSteps = STEPS.filter(s => s.id !== "welcome");

  return (
    <div className="flex items-center justify-center gap-1 px-4 py-3" dir="rtl">
      {visibleSteps.map((step, i) => {
        const stepIdx = i + 1;
        const isComplete = currentStepIndex > stepIdx;
        const isCurrent = currentStepIndex === stepIdx;

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                isComplete 
                  ? "bg-secondary text-secondary-foreground" 
                  : isCurrent 
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background" 
                    : "bg-muted text-muted-foreground"
              }`}>
                {isComplete ? <Check className="w-3.5 h-3.5" /> : stepIdx}
              </div>
              <span className={`text-[10px] font-medium hidden sm:block ${
                isCurrent ? "text-primary" : "text-muted-foreground"
              }`}>
                {step.label}
              </span>
            </div>
            {i < visibleSteps.length - 1 && (
              <div className={`h-[2px] w-4 sm:w-8 mt-[-14px] sm:mt-[-10px] transition-colors duration-300 ${
                isComplete ? "bg-secondary" : "bg-muted"
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}