import { useState } from "react";
import { Search, CheckCircle, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Task } from "./task-card";

interface DisambiguationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (task: Task, index: number) => void;
  tasks: Task[];
  query: string;
  action: "complete" | "delete" | "modify";
  message: string;
  className?: string;
}

export function DisambiguationDialog({
  isOpen,
  onClose,
  onSelect,
  tasks,
  query,
  action,
  message,
  className,
}: DisambiguationDialogProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleTaskSelect = (task: Task, index: number) => {
    setSelectedIndex(index);
    onSelect(task, index);
  };

  const getActionIcon = () => {
    switch (action) {
      case "complete":
        return <CheckCircle className="w-5 h-5 text-success" />;
      case "delete":
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      case "modify":
        return <Search className="w-5 h-5 text-info" />;
    }
  };

  const getActionColor = () => {
    switch (action) {
      case "complete":
        return "border-success/20 bg-success/5";
      case "delete":
        return "border-destructive/20 bg-destructive/5";
      case "modify":
        return "border-info/20 bg-info/5";
    }
  };

  const formatTaskTitle = (title: string) => {
    // Highlight matching parts of the query
    const regex = new RegExp(`(${query})`, "gi");
    const parts = title.split(regex);

    return (
      <span>
        {parts.map((part, index) =>
          regex.test(part) ? (
            <mark
              key={index}
              className="bg-primary/20 text-primary px-1 rounded font-medium"
            >
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          ),
        )}
      </span>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className={cn(
          "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
          "w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden",
          "glass-thick rounded-3xl border border-border/30",
          "animate-spring-in apple-card shadow-2xl",
          className,
        )}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border/20">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center border-2",
                  getActionColor(),
                )}
              >
                {getActionIcon()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground font-display">
                  Which task did you mean?
                </h3>
                <p className="text-sm text-muted-foreground">
                  I found multiple matches for "{query}"
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full glass-thin hover:glass-regular flex items-center justify-center apple-button haptic-light"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Message */}
        <div className="px-6 py-4">
          <div className="glass-ultra-thin rounded-2xl p-3 border border-border/20">
            <p className="text-sm text-foreground">{message}</p>
          </div>
        </div>

        {/* Task List */}
        <div className="px-6 pb-6 max-h-96 overflow-y-auto">
          <div className="space-y-3">
            {tasks.map((task, index) => (
              <button
                key={task.id}
                onClick={() => handleTaskSelect(task, index)}
                className={cn(
                  "w-full text-left p-4 rounded-2xl transition-all duration-200",
                  "glass-thin hover:glass-regular border border-border/30",
                  "apple-button haptic-light group",
                  selectedIndex === index && "ring-2 ring-primary/50",
                )}
              >
                <div className="flex items-start space-x-3">
                  {/* Task Number */}
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5 flex-shrink-0">
                    {index + 1}
                  </div>

                  {/* Task Content */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground text-sm leading-tight mb-1">
                      {formatTaskTitle(task.title)}
                    </div>

                    {task.description && (
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {task.description}
                      </div>
                    )}

                    {/* Task Meta */}
                    <div className="flex items-center space-x-2 mt-2">
                      <span
                        className={cn(
                          "px-2 py-1 text-xs rounded-full font-medium",
                          task.status === "completed"
                            ? "bg-success/20 text-success"
                            : task.status === "in-progress"
                              ? "bg-warning/20 text-warning"
                              : "bg-muted/20 text-muted-foreground",
                        )}
                      >
                        {task.status}
                      </span>

                      <span
                        className={cn(
                          "px-2 py-1 text-xs rounded-full font-medium",
                          task.priority === "urgent"
                            ? "bg-destructive/20 text-destructive"
                            : task.priority === "high"
                              ? "bg-warning/20 text-warning"
                              : task.priority === "low"
                                ? "bg-success/20 text-success"
                                : "bg-info/20 text-info",
                        )}
                      >
                        {task.priority}
                      </span>

                      {task.tags && task.tags.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {task.tags.slice(0, 2).join(", ")}
                          {task.tags.length > 2 && " +more"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Selection indicator */}
                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <CheckCircle className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/20 bg-muted/20">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Click on a task or say the number (like "1" or "2")
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
