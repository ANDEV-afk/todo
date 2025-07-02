import { useState } from "react";
import { Check, Clock, Flag, Mic, MoreVertical, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type TaskPriority = "urgent" | "high" | "medium" | "low";
export type TaskStatus = "pending" | "in-progress" | "completed";

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: Date;
  tags?: string[];
}

interface TaskCardProps {
  task: Task;
  taskNumber?: number;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
  onDelete?: (taskId: string) => void;
  onEdit?: (taskId: string) => void;
  className?: string;
}

const priorityConfig = {
  urgent: { class: "priority-urgent", icon: "🔥", label: "Urgent" },
  high: { class: "priority-high", icon: "⚡", label: "High" },
  medium: { class: "priority-medium", icon: "📋", label: "Medium" },
  low: { class: "priority-low", icon: "🌱", label: "Low" },
};

export function TaskCard({
  task,
  taskNumber,
  onStatusChange,
  onDelete,
  onEdit,
  className,
}: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const priority = priorityConfig[task.priority];

  const handleStatusToggle = () => {
    const newStatus: TaskStatus =
      task.status === "completed" ? "pending" : "completed";
    onStatusChange?.(task.id, newStatus);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div
      className={cn(
        "group relative p-6 rounded-2xl apple-card haptic-light",
        "glass-thin hover:glass-regular transition-all duration-500 ease-out",
        "cursor-pointer border border-border/50",
        task.status === "completed" && "opacity-60",
        className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Priority indicator */}
      <div
        className={cn(
          "absolute top-0 left-6 w-16 h-1.5 rounded-b-lg",
          priority.class,
          "shadow-sm",
        )}
      />

      {/* Task number indicator */}
      {taskNumber && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-muted/80 text-muted-foreground text-xs font-bold flex items-center justify-center border border-border/50">
          {taskNumber}
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleStatusToggle}
            className={cn(
              "w-6 h-6 rounded-full border-2 transition-all duration-300 ease-out",
              "flex items-center justify-center apple-button haptic-light",
              "shadow-sm hover:shadow-md",
              task.status === "completed"
                ? "bg-success border-success scale-110"
                : "border-border hover:border-success/50 hover:bg-success/10",
            )}
          >
            {task.status === "completed" && (
              <Check className="w-3.5 h-3.5 text-white" />
            )}
          </button>

          <div
            className={cn(
              "flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold",
              "border shadow-sm transition-all duration-200",
              priority.class,
            )}
          >
            <span className="text-sm">{priority.icon}</span>
            <span className="font-display">{priority.label}</span>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {isHovered && (
            <div className="flex items-center space-x-2 animate-spring-in">
              <button
                onClick={() => onEdit?.(task.id)}
                className={cn(
                  "w-8 h-8 rounded-full glass-thin flex items-center justify-center",
                  "apple-button haptic-light transition-all duration-200",
                  "hover:bg-info/20 hover:border-info/30",
                )}
              >
                <Mic className="w-3.5 h-3.5 text-info" />
              </button>
              <button
                onClick={() => onDelete?.(task.id)}
                className={cn(
                  "w-8 h-8 rounded-full glass-thin flex items-center justify-center",
                  "apple-button haptic-light transition-all duration-200",
                  "hover:bg-destructive/20 hover:border-destructive/30",
                )}
              >
                <X className="w-3.5 h-3.5 text-destructive" />
              </button>
            </div>
          )}
          <MoreVertical className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      <div className="mb-4">
        <h3
          className={cn(
            "font-semibold text-foreground mb-2 font-display text-lg leading-tight",
            task.status === "completed" && "line-through opacity-60",
          )}
        >
          {task.title}
        </h3>
        {task.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {task.description}
          </p>
        )}
      </div>

      {task.dueDate && (
        <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-3">
          <Clock className="w-3.5 h-3.5" />
          <span className="font-medium">{formatDate(task.dueDate)}</span>
        </div>
      )}

      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {task.tags.map((tag, index) => (
            <span
              key={index}
              className={cn(
                "px-2.5 py-1 text-xs rounded-full font-medium",
                "bg-muted/80 text-muted-foreground border border-border/50",
                "transition-all duration-200 hover:bg-muted",
              )}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Drag handle */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-gradient-to-b from-primary/40 to-accent/40 rounded-r-lg opacity-0 group-hover:opacity-100 transition-all duration-300" />
    </div>
  );
}
