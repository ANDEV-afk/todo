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
import { GeminiService } from "@/lib/gemini-service";
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
    command: "add task meeting with team",
  },
  {
    icon: Calendar,
    label: "Schedule",
    command: "schedule meeting tomorrow at 2 PM",
  },
  { icon: FileText, label: "Notes", command: "add note project ideas" },
  { icon: Sparkles, label: "Complete", command: "mark task complete" },
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
      const command = await GeminiService.parseVoiceCommand(commandText);

      switch (command.type) {
        case "task":
        case "reminder":
        case "meeting":
        case "note":
          const newTask = {
            title: command.title,
            description: command.description,
            priority: command.priority || ("medium" as const),
            status: "pending" as const,
            dueDate:
              command.date && command.time
                ? new Date(`${command.date}T${command.time}`)
                : command.date
                  ? new Date(command.date)
                  : undefined,
            tags: [command.type],
          };

          StorageService.addTask(newTask);
          onTaskUpdate?.();
          break;

        case "complete":
          const pendingTasks = StorageService.getTasksByStatus("pending");
          if (pendingTasks.length > 0) {
            StorageService.updateTaskStatus(pendingTasks[0].id, "completed");
            onTaskUpdate?.();
          }
          break;

        case "delete":
          const allTasks = StorageService.getTasks();
          if (allTasks.length > 0) {
            StorageService.deleteTask(allTasks[0].id);
            onTaskUpdate?.();
          }
          break;
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
              placeholder={isProcessing ? "Processing..." : placeholder}
              disabled={isProcessing}
              className="flex-1 bg-transparent border-0 outline-none text-foreground placeholder-muted-foreground text-lg disabled:opacity-50"
            />
            <div className="flex items-center space-x-2">
              {isProcessing && (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
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
