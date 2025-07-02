import { useState, useEffect, useRef } from "react";
import { Check, Trash2, Save, Edit3, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Task, TaskPriority, TaskStatus } from "./task-card";
import { Button } from "./button";

export interface EditableTask extends Task {
  isNew?: boolean;
  isEditing?: boolean;
}

interface EditableTaskCardProps {
  task: EditableTask;
  taskNumber: number;
  onSave?: (taskId: string, title: string) => void;
  onDelete?: (taskId: string) => void;
  onMarkDone?: (taskId: string) => void;
  onCancel?: (taskId: string) => void;
  className?: string;
}

const priorityConfig = {
  urgent: { class: "priority-urgent", icon: "🔥", label: "Urgent" },
  high: { class: "priority-high", icon: "⚡", label: "High" },
  medium: { class: "priority-medium", icon: "📋", label: "Medium" },
  low: { class: "priority-low", icon: "🌱", label: "Low" },
};

export function EditableTaskCard({
  task,
  taskNumber,
  onSave,
  onDelete,
  onMarkDone,
  onCancel,
  className,
}: EditableTaskCardProps) {
  const [title, setTitle] = useState(task.title);
  const [isEditing, setIsEditing] = useState(
    task.isNew || task.isEditing || false,
  );
  const [hasChanges, setHasChanges] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const priority = priorityConfig[task.priority];

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Auto-resize textarea
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [isEditing]);

  useEffect(() => {
    setHasChanges(title !== task.title);
  }, [title, task.title]);

  const handleSave = () => {
    if (title.trim()) {
      onSave?.(task.id, title.trim());
      setIsEditing(false);
      setHasChanges(false);
    }
  };

  const handleCancel = () => {
    if (task.isNew) {
      onCancel?.(task.id);
    } else {
      setTitle(task.title);
      setIsEditing(false);
      setHasChanges(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleMarkDone = () => {
    onMarkDone?.(task.id);
  };

  const handleDelete = () => {
    onDelete?.(task.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTitle(e.target.value);
    // Auto-resize
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  return (
    <div
      className={cn(
        "group relative p-6 rounded-2xl apple-card haptic-light",
        "glass-thin hover:glass-regular transition-all duration-500 ease-out",
        "border border-border/50 animate-spring-in",
        task.isNew && "ring-2 ring-primary/50 shadow-lg scale-105",
        isEditing && "ring-2 ring-accent/50",
        task.status === "completed" && "opacity-60",
        className,
      )}
    >
      {/* Priority indicator */}
      <div
        className={cn(
          "absolute top-0 left-6 w-16 h-1.5 rounded-b-lg",
          priority.class,
          "shadow-sm",
        )}
      />

      {/* Task number badge */}
      <div className="absolute top-3 right-3 flex items-center space-x-2">
        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary text-sm font-bold flex items-center justify-center border border-primary/30">
          #{taskNumber}
        </div>
        {task.isNew && (
          <div className="animate-pulse">
            <Clock className="w-4 h-4 text-accent" />
          </div>
        )}
      </div>

      {/* Header with status indicator */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleMarkDone}
            disabled={task.status === "completed"}
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

        <div className="text-xs text-muted-foreground font-medium">
          {task.isNew ? "New Task" : "Task"}
        </div>
      </div>

      {/* Task Content */}
      <div className="mb-6">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              ref={textareaRef}
              value={title}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Enter task description..."
              className={cn(
                "w-full resize-none bg-transparent border-2 border-accent/30 rounded-xl",
                "p-3 text-foreground font-semibold text-lg leading-tight font-display",
                "placeholder-muted-foreground focus:outline-none focus:border-accent",
                "transition-all duration-300 min-h-[60px]",
              )}
              rows={1}
            />
            <div className="text-xs text-muted-foreground">
              Press{" "}
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">
                ⌘ + Enter
              </kbd>{" "}
              to save,{" "}
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Esc</kbd>{" "}
              to cancel
            </div>
          </div>
        ) : (
          <div
            onClick={handleEdit}
            className={cn(
              "cursor-pointer group/edit transition-all duration-200",
              "hover:bg-muted/20 rounded-lg p-2 -m-2",
            )}
          >
            <h3
              className={cn(
                "font-semibold text-foreground font-display text-lg leading-tight",
                "group-hover/edit:text-accent transition-colors duration-200",
                task.status === "completed" && "line-through opacity-60",
              )}
            >
              {title}
            </h3>
            <div className="flex items-center space-x-2 mt-1 opacity-0 group-hover/edit:opacity-100 transition-opacity">
              <Edit3 className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Click to edit
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!title.trim()}
                className={cn(
                  "apple-button haptic-medium bg-success hover:bg-success/90 text-success-foreground",
                  !title.trim() && "opacity-50 cursor-not-allowed",
                )}
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                className="apple-button haptic-light"
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleEdit}
                className="apple-button haptic-light"
              >
                <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </Button>
              <Button
                size="sm"
                onClick={handleMarkDone}
                disabled={task.status === "completed"}
                className={cn(
                  "apple-button haptic-medium",
                  task.status === "completed"
                    ? "bg-success text-success-foreground opacity-60"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground",
                )}
              >
                <Check className="w-3.5 h-3.5 mr-1.5" />
                {task.status === "completed" ? "Done" : "Mark Done"}
              </Button>
            </>
          )}
        </div>

        <Button
          size="sm"
          variant="destructive"
          onClick={handleDelete}
          className="apple-button haptic-medium"
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
          Delete
        </Button>
      </div>

      {/* Change indicator */}
      {hasChanges && isEditing && (
        <div className="absolute top-2 left-2 w-2 h-2 bg-accent rounded-full animate-pulse" />
      )}

      {/* New task indicator */}
      {task.isNew && (
        <div className="absolute -top-2 -left-2 w-4 h-4 bg-primary rounded-full animate-bounce-gentle">
          <div className="w-full h-full bg-primary rounded-full animate-ping opacity-75" />
        </div>
      )}
    </div>
  );
}
