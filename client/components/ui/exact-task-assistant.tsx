import { useState, useEffect } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  Loader2,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ExactVoiceProcessor,
  VoiceProcessingResult,
} from "@/lib/exact-voice-processor";
import { ExactTaskService } from "@/lib/exact-task-service";
import { Button } from "./button";
import { Input } from "./input";

interface ExactTaskAssistantProps {
  onTaskUpdate?: () => void;
  className?: string;
}

type AssistantState =
  | "idle"
  | "listening"
  | "processing"
  | "confirmation"
  | "success"
  | "error";

export function ExactTaskAssistant({
  onTaskUpdate,
  className,
}: ExactTaskAssistantProps) {
  const [state, setState] = useState<AssistantState>("idle");
  const [transcript, setTranscript] = useState("");
  const [message, setMessage] = useState("");
  const [textInput, setTextInput] = useState("");
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [pendingTaskTitle, setPendingTaskTitle] = useState("");

  useEffect(() => {
    // Clear messages after 5 seconds
    if (message && state !== "confirmation") {
      const timer = setTimeout(() => {
        setMessage("");
        if (state === "success" || state === "error") {
          setState("idle");
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, state]);

  const handleVoiceResult = (result: VoiceProcessingResult) => {
    if (result.success) {
      setMessage(result.message);
      setState("success");
      onTaskUpdate?.();
    } else if (result.requiresConfirmation && result.taskId) {
      setMessage(result.message);
      setState("confirmation");
      setPendingTaskId(result.taskId);

      const confirmation = ExactVoiceProcessor.getPendingConfirmation();
      if (confirmation) {
        setPendingTaskTitle(confirmation.taskTitle);
      }
    } else {
      setMessage(result.message);
      setState("error");
    }
  };

  const handleTextCommand = (command: string) => {
    if (!command.trim()) return;

    setState("processing");

    // Simulate processing delay for user feedback
    setTimeout(() => {
      const result = ExactVoiceProcessor.processVoiceCommand(command);
      handleVoiceResult(result);
    }, 300);
  };

  const handleVoiceToggle = () => {
    if (state === "listening") {
      ExactVoiceProcessor.stopListening();
      setState("idle");
      setTranscript("");
    } else {
      setState("listening");
      setMessage("");

      const success = ExactVoiceProcessor.startListening(
        handleVoiceResult,
        (transcript) => setTranscript(transcript),
      );

      if (!success) {
        setState("error");
        setMessage("Failed to start voice recognition");
      }
    }
  };

  const handleConfirmation = (confirmed: boolean) => {
    if (confirmed) {
      setState("processing");

      const result = ExactVoiceProcessor.processVoiceCommand("yes");
      handleVoiceResult(result);
    } else {
      const result = ExactVoiceProcessor.processVoiceCommand("no");
      handleVoiceResult(result);
    }

    setPendingTaskId(null);
    setPendingTaskTitle("");
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      handleTextCommand(textInput.trim());
      setTextInput("");
    }
  };

  const getStateIcon = () => {
    switch (state) {
      case "listening":
        return <MicOff className="w-5 h-5 text-white" />;
      case "processing":
        return <Loader2 className="w-5 h-5 text-white animate-spin" />;
      case "success":
        return <CheckCircle className="w-5 h-5 text-white" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-white" />;
      case "confirmation":
        return <Trash2 className="w-5 h-5 text-white" />;
      default:
        return <Mic className="w-5 h-5 text-white" />;
    }
  };

  const getStateStyle = () => {
    switch (state) {
      case "listening":
        return "voice-listening";
      case "processing":
        return "voice-processing bg-info";
      case "success":
        return "voice-success";
      case "error":
        return "voice-error";
      case "confirmation":
        return "bg-warning hover:bg-warning/90";
      default:
        return "voice-idle apple-button";
    }
  };

  const getStatusMessage = () => {
    if (message) return message;
    if (transcript) return `"${transcript}"`;

    switch (state) {
      case "listening":
        return "Listening for exact commands...";
      case "processing":
        return "Processing command...";
      case "confirmation":
        return "Waiting for confirmation...";
      default:
        return "Exact Task Assistant";
    }
  };

  const getStatusIcon = () => {
    if (state === "success") return "✅";
    if (state === "error") return "❌";
    if (state === "processing") return "🧠";
    if (state === "listening") return "👂";
    if (state === "confirmation") return "❓";
    return "🎯";
  };

  const isVoiceSupported = ExactVoiceProcessor.isVoiceSupported();

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "glass-thick rounded-2xl p-6 min-w-[320px] max-w-[420px]",
        "animate-float-gentle apple-card border border-border/30",
        "transition-all duration-500 ease-out",
        (state === "listening" || state === "processing") && "scale-105",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start space-x-3 mb-4">
        <button
          onClick={handleVoiceToggle}
          disabled={!isVoiceSupported || state === "processing"}
          className={cn(
            "relative w-12 h-12 rounded-full transition-all duration-300",
            "flex items-center justify-center flex-shrink-0 fab",
            "haptic-medium shadow-glass",
            getStateStyle(),
            (!isVoiceSupported || state === "processing") &&
              "opacity-50 cursor-not-allowed",
          )}
        >
          {getStateIcon()}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-lg">{getStatusIcon()}</span>
            <span className="text-sm font-semibold text-foreground font-display">
              Exact Task Assistant
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            No auto-correction • Exact matching only
          </div>
        </div>
      </div>

      {/* Status Message */}
      <div className="glass-ultra-thin rounded-xl p-3 mb-4 border border-border/20">
        <div className="text-sm text-foreground leading-relaxed">
          {getStatusMessage()}
        </div>

        {state === "listening" && (
          <div className="flex space-x-1 mt-2">
            <div
              className="w-1 h-2 bg-primary rounded-full animate-bounce-gentle"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="w-1 h-3 bg-primary rounded-full animate-bounce-gentle"
              style={{ animationDelay: "150ms" }}
            />
            <div
              className="w-1 h-2 bg-primary rounded-full animate-bounce-gentle"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {state === "confirmation" && (
        <div className="glass-thin rounded-xl p-4 mb-4 border border-warning/30 bg-warning/5">
          <div className="text-sm text-foreground mb-3">
            Delete task: "{pendingTaskTitle}"?
          </div>
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleConfirmation(true)}
              className="flex-1 haptic-medium"
            >
              Yes, Delete
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleConfirmation(false)}
              className="flex-1 haptic-light"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Text Input */}
      <form onSubmit={handleTextSubmit} className="space-y-3">
        <div className="flex space-x-2">
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type exact command..."
            className="flex-1 text-sm"
            disabled={state === "processing"}
          />
          <Button
            type="submit"
            size="sm"
            disabled={!textInput.trim() || state === "processing"}
            className="apple-button haptic-light"
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
        </div>
      </form>

      {/* Examples */}
      {state === "idle" && (
        <div className="mt-4 pt-4 border-t border-border/30">
          <div className="text-xs text-muted-foreground space-y-2">
            <div className="font-medium text-foreground mb-2">
              Example commands:
            </div>
            <div>"Add task call my friend at 5 PM"</div>
            <div>"Delete task call my friend at 5 PM"</div>
            <div>"Complete task call my friend at 5 PM"</div>
          </div>
        </div>
      )}

      {/* Voice Not Supported */}
      {!isVoiceSupported && (
        <div className="mt-4 pt-4 border-t border-border/30">
          <div className="text-xs text-destructive flex items-center space-x-2">
            <AlertCircle className="w-3 h-3" />
            <span>Voice recognition not supported</span>
          </div>
        </div>
      )}
    </div>
  );
}
