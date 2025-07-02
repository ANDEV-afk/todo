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
        "group relative p-4 rounded-xl transition-all duration-300",
        "glass hover:glass-strong",
        "hover:scale-[1.02] hover:-translate-y-1",
        "cursor-pointer",
        task.status === "completed" && "opacity-60",
        className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Priority indicator */}
      <div
        className={cn(
          "absolute top-0 left-4 w-12 h-1 rounded-b-full",
          priority.class,
        )}
      />

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleStatusToggle}
            className={cn(
              "w-5 h-5 rounded-full border-2 transition-all duration-200",
              "flex items-center justify-center",
              task.status === "completed"
                ? "bg-green-500 border-green-500"
                : "border-gray-300 hover:border-green-400",
            )}
          >
            {task.status === "completed" && (
              <Check className="w-3 h-3 text-white" />
            )}
          </button>

          <div
            className={cn(
              "flex items-center space-x-2 px-2 py-1 rounded-full text-xs font-medium",
              priority.class,
            )}
          >
            <span>{priority.icon}</span>
            <span>{priority.label}</span>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {isHovered && (
            <div className="flex items-center space-x-1 animate-slide-up">
              <button
                onClick={() => onEdit?.(task.id)}
                className="w-6 h-6 rounded-full bg-blue-500/20 hover:bg-blue-500/30 flex items-center justify-center transition-colors"
              >
                <Mic className="w-3 h-3 text-blue-600" />
              </button>
              <button
                onClick={() => onDelete?.(task.id)}
                className="w-6 h-6 rounded-full bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center transition-colors"
              >
                <X className="w-3 h-3 text-red-600" />
              </button>
            </div>
          )}
          <MoreVertical className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      <div className="mb-3">
        <h3
          className={cn(
            "font-semibold text-foreground mb-1",
            task.status === "completed" && "line-through",
          )}
        >
          {task.title}
        </h3>
        {task.description && (
          <p className="text-sm text-muted-foreground">{task.description}</p>
        )}
      </div>

      {task.dueDate && (
        <div className="flex items-center space-x-1 text-xs text-muted-foreground mb-2">
          <Clock className="w-3 h-3" />
          <span>{formatDate(task.dueDate)}</span>
        </div>
      )}

      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.tags.map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 text-xs rounded-full bg-secondary/50 text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Drag handle */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary/20 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
