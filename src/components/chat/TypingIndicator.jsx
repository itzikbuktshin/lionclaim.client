import React from "react";
import { motion } from "framer-motion";
import { Bot } from "lucide-react";

export default function TypingIndicator() {
  return (
    <div className="flex gap-3 flex-row-reverse">
      <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-primary text-primary-foreground">
        <Bot className="w-5 h-5" />
      </div>
      <div className="bg-card border border-border rounded-2xl px-5 py-3 shadow-sm">
        <div className="flex gap-1.5 items-center h-5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-muted-foreground/40"
              animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}