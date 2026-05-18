import React from "react";
import { Check } from "lucide-react";

export default function StepIndicator({ currentStepIndex, steps }) {
  const visibleSteps = steps.filter(s => s.id !== "welcome");

  return (
    <div className="flex items-center justify-center px-3 py-2 overflow-x-auto" dir="rtl">
      <div className="flex items-center gap-0.5 min-w-0">
        {visibleSteps.map((step, i) => {
          const stepIdx = i + 1;
          const isComplete = currentStepIndex > stepIdx;
          const isCurrent = currentStepIndex === stepIdx;

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-semibold transition-all duration-300 ${
                  isComplete
                    ? "bg-secondary text-secondary-foreground"
                    : isCurrent
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-1 ring-offset-background scale-110"
                      : "bg-muted text-muted-foreground"
                }`}>
                  {isComplete ? <Check className="w-3 h-3" /> : stepIdx}
                </div>
                <span className={`text-[9px] sm:text-[10px] font-medium hidden sm:block max-w-[48px] text-center leading-tight ${
                  isCurrent ? "text-primary" : "text-muted-foreground"
                }`}>
                  {step.label}
                </span>
              </div>
              {i < visibleSteps.length - 1 && (
                <div className={`h-[2px] w-3 sm:w-6 flex-shrink-0 mb-2 sm:mb-3 transition-colors duration-300 ${
                  isComplete ? "bg-secondary" : "bg-muted"
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}