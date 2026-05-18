import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

export default function ChatInput({ onSend, placeholder, disabled, type = "text", options = null }) {
  const [value, setValue] = useState("");

  const handleSend = () => {
    if (!value.trim() && !options) return;
    onSend(value.trim());
    setValue("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (options) {
    return (
      <div className="flex flex-wrap gap-2 justify-end p-4">
        {options.map((opt) => (
          <Button
            key={opt.value}
            variant="outline"
            onClick={() => onSend(opt.value)}
            className="rounded-full border-primary/30 hover:bg-primary hover:text-primary-foreground transition-all duration-200 h-11 px-5 text-sm font-medium"
          >
            {opt.label}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 p-4 border-t border-border bg-card/50 backdrop-blur-sm">
      <Button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        size="icon"
        className="rounded-full flex-shrink-0 bg-primary hover:bg-primary/90 w-11 h-11"
      >
        <Send className="w-4 h-4" />
      </Button>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "הקלד כאן..."}
        disabled={disabled}
        type={type}
        inputMode="numeric"
        className="rounded-full text-right bg-background h-11 text-base"
        dir="rtl"
      />
    </div>
  );
}