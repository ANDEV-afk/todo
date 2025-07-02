import { useState } from "react";
import {
  Search,
  Sparkles,
  Calendar,
  FileText,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandInputProps {
  onCommand?: (command: string) => void;
  placeholder?: string;
  className?: string;
}

const quickActions = [
  { icon: CheckSquare, label: "Add Task", command: "add task" },
  { icon: Calendar, label: "Schedule", command: "schedule" },
  { icon: FileText, label: "Notes", command: "notes" },
  { icon: Sparkles, label: "AI Tips", command: "tips" },
];

export function CommandInput({
  onCommand,
  placeholder = "What would you like to do?",
  className,
}: CommandInputProps) {
  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onCommand?.(input.trim());
      setInput("");
    }
  };

  const handleQuickAction = (command: string) => {
    onCommand?.(command);
  };

  return (
    <div
      className={cn(
        "fixed top-6 left-1/2 -translate-x-1/2 z-40",
        "w-full max-w-2xl px-4",
        className,
      )}
    >
      <div
        className={cn(
          "glass-strong rounded-2xl p-1",
          "transition-all duration-300",
          isFocused && "scale-105 shadow-2xl",
        )}
      >
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-center space-x-3 p-3">
            <Search className="w-5 h-5 text-primary" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              className="flex-1 bg-transparent border-0 outline-none text-foreground placeholder-muted-foreground text-lg"
            />
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground px-2 py-1 rounded-md bg-muted/50">
                ⌘K
              </span>
            </div>
          </div>
        </form>

        {isFocused && (
          <div className="border-t border-border/50 p-2 animate-slide-up">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(action.command)}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                  >
                    <Icon className="w-4 h-4 text-primary" />
                    <span className="text-sm text-foreground">
                      {action.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
