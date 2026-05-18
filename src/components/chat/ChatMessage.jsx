import React from "react";
import { motion } from "framer-motion";
import { Bot, User } from "lucide-react";

export default function ChatMessage({ message, isAgent }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex gap-3 ${isAgent ? "flex-row-reverse" : "flex-row-reverse"}`}
    >
      <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
        isAgent 
          ? "bg-primary text-primary-foreground" 
          : "bg-secondary text-secondary-foreground"
      }`}>
        {isAgent ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
      </div>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
        isAgent 
          ? "bg-card border border-border shadow-sm" 
          : "bg-primary text-primary-foreground"
      }`}>
        <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">{message}</p>
      </div>
    </motion.div>
  );
}