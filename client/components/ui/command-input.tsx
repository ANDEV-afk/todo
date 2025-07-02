import { useState } from "react";
import {
  Search,
  Sparkles,
  Calendar,
  FileText,
  CheckSquare,
  Mic,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SmartTaskAssistant } from "@/lib/smart-assistant";
import { StorageService } from "@/lib/storage-service";

interface CommandInputProps {
  onCommand?: (command: string) => void;
  onTaskUpdate?: () => void;
  placeholder?: string;
  className?: string;
}

const quickActions = [
  {
    icon: CheckSquare,
    label: "Add Task",
    command: "Add task: Buy groceries and call mom",
  },
  {
    icon: Calendar,
    label: "Schedule",
    command: "Create a task: Submit assignment before 5 PM tomorrow",
  },
  {
    icon: FileText,
    label: "Complete",
    command: "Mark the task 'Buy groceries' as done",
  },
  {
    icon: Sparkles,
    label: "Modify",
    command: "Change task 'Buy groceries' to 'Buy groceries and fruits'",
  },
];

export function CommandInput({
  onCommand,
  onTaskUpdate,
  placeholder = "What would you like to do?",
  className,
}: CommandInputProps) {
  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const processCommand = async (commandText: string) => {
    setIsProcessing(true);

    try {
      const result = await SmartTaskAssistant.processCommand(commandText);

      if (result.success) {
        onTaskUpdate?.();
        console.log("Command executed successfully:", result.message);
      } else {
        // For non-successful results, we'd need to handle dialogs here too
        // For now, just log the conversational message
        console.log("Assistant response:", result.message);
      }
    } catch (error) {
      console.error("Error processing command:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      processCommand(input.trim());
      onCommand?.(input.trim());
      setInput("");
    }
  };

  const handleQuickAction = (command: string) => {
    processCommand(command);
    onCommand?.(command);
  };

  return (
    <div
      className={cn(
        "fixed top-6 left-1/2 -translate-x-1/2 z-40",
        "w-full max-w-3xl px-6",
        className,
      )}
    >
      <div
        className={cn(
          "glass-thick rounded-3xl p-2 border border-border/30",
          "transition-all duration-500 ease-out apple-card",
          "shadow-glass hover:shadow-glass-lg",
          isFocused && "scale-105 shadow-2xl ring-2 ring-primary/20",
        )}
      >
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-center space-x-4 p-4">
            <Search className="w-5 h-5 text-primary flex-shrink-0" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={isProcessing ? "Processing..." : placeholder}
              disabled={isProcessing}
              className={cn(
                "flex-1 bg-transparent border-0 outline-none text-foreground",
                "placeholder-muted-foreground text-lg font-medium disabled:opacity-50",
                "font-display",
              )}
            />
            <div className="flex items-center space-x-3 flex-shrink-0">
              {isProcessing && (
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
              <span className="text-xs text-muted-foreground px-3 py-1.5 rounded-lg bg-muted/60 font-medium">
                ⌘K
              </span>
            </div>
          </div>
        </form>

        {isFocused && (
          <div className="border-t border-border/30 p-3 animate-spring-in">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(action.command)}
                    className={cn(
                      "flex items-center space-x-2 p-3 rounded-xl transition-all duration-200",
                      "glass-ultra-thin hover:glass-thin apple-button haptic-light",
                      "text-left border border-border/20 hover:border-border/40",
                    )}
                  >
                    <Icon className="w-4 h-4 text-primary" />
                    <span className="text-sm text-foreground font-medium font-display">
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
