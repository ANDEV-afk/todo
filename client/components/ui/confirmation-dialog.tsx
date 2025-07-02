import { useState } from "react";
import {
  AlertTriangle,
  Check,
  X,
  MessageCircle,
  Mic,
  MicOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Task } from "./task-card";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (confirmed: boolean) => void;
  task?: Task;
  action: "delete" | "modify";
  message: string;
  newContent?: string;
  onVoiceResponse?: (response: string) => void;
  className?: string;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  task,
  action,
  message,
  newContent,
  onVoiceResponse,
  className,
}: ConfirmationDialogProps) {
  const [isListening, setIsListening] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(true);
    onClose();
  };

  const handleCancel = () => {
    onConfirm(false);
    onClose();
  };

  const toggleVoiceInput = () => {
    setIsListening(!isListening);
    // Voice functionality would be handled by parent component
  };

  const getActionIcon = () => {
    switch (action) {
      case "delete":
        return <AlertTriangle className="w-6 h-6 text-destructive" />;
      case "modify":
        return <MessageCircle className="w-6 h-6 text-info" />;
      default:
        return <AlertTriangle className="w-6 h-6 text-warning" />;
    }
  };

  const getActionColor = () => {
    switch (action) {
      case "delete":
        return "border-destructive/20 bg-destructive/5";
      case "modify":
        return "border-info/20 bg-info/5";
      default:
        return "border-warning/20 bg-warning/5";
    }
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
          "w-full max-w-md mx-4",
          "glass-thick rounded-3xl p-8 border border-border/30",
          "animate-spring-in apple-card shadow-2xl",
          className,
        )}
      >
        <div className="text-center space-y-6">
          {/* Icon and Title */}
          <div className="flex flex-col items-center space-y-4">
            <div
              className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center border-2",
                getActionColor(),
              )}
            >
              {getActionIcon()}
            </div>

            <div>
              <h3 className="text-xl font-bold text-foreground font-display">
                {action === "delete" ? "Confirm Delete" : "Confirm Changes"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                This action requires confirmation
              </p>
            </div>
          </div>

          {/* Task Preview */}
          {task && (
            <div className="glass-thin rounded-2xl p-4 border border-border/30">
              <div className="text-left">
                <div className="font-medium text-foreground mb-1">
                  Current task:
                </div>
                <div className="text-sm text-muted-foreground break-words">
                  "{task.title}"
                </div>

                {action === "modify" && newContent && (
                  <>
                    <div className="font-medium text-foreground mt-3 mb-1">
                      Will change to:
                    </div>
                    <div className="text-sm text-info break-words">
                      "{newContent}"
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Message */}
          <div className="glass-ultra-thin rounded-2xl p-4 border border-border/20">
            <p className="text-sm text-foreground leading-relaxed">{message}</p>
          </div>

          {/* Voice Input Option */}
          <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
            <button
              onClick={toggleVoiceInput}
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-full transition-all duration-200",
                "apple-button haptic-light border border-border/30",
                isListening
                  ? "bg-primary text-primary-foreground"
                  : "glass-thin hover:glass-regular",
              )}
            >
              {isListening ? (
                <>
                  <MicOff className="w-3 h-3" />
                  <span>Listening...</span>
                </>
              ) : (
                <>
                  <Mic className="w-3 h-3" />
                  <span>Say "yes" or "no"</span>
                </>
              )}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleCancel}
              className={cn(
                "flex-1 px-6 py-3 rounded-2xl font-medium transition-all duration-300",
                "glass-thin hover:glass-regular border border-border/30",
                "apple-button haptic-light text-foreground",
              )}
            >
              Cancel
            </button>

            <button
              onClick={handleConfirm}
              className={cn(
                "flex-1 px-6 py-3 rounded-2xl font-medium transition-all duration-300",
                "apple-button haptic-medium shadow-lg hover:shadow-xl",
                action === "delete"
                  ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground",
              )}
            >
              <div className="flex items-center justify-center space-x-2">
                <Check className="w-4 h-4" />
                <span>{action === "delete" ? "Delete" : "Update"}</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
