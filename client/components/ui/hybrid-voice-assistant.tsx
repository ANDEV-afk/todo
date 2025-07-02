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
import { voiceService } from "@/lib/voice-service";
import {
  HybridTaskProcessor,
  HybridTaskResult,
} from "@/lib/hybrid-task-processor";
import { Button } from "./button";

interface HybridVoiceAssistantProps {
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

export function HybridVoiceAssistant({
  onTaskUpdate,
  className,
}: HybridVoiceAssistantProps) {
  const [state, setState] = useState<AssistantState>("idle");
  const [transcript, setTranscript] = useState("");
  const [message, setMessage] = useState("");
  const [isAvailable, setIsAvailable] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    taskTitle: string;
    action: string;
  } | null>(null);

  useEffect(() => {
    setIsAvailable(voiceService.isSupported());

    // Request microphone permission on component mount
    if (voiceService.isSupported()) {
      voiceService.requestMicrophonePermission();
    }
  }, []);

  useEffect(() => {
    // Clear messages after 4 seconds unless waiting for confirmation
    if (message && state !== "confirmation") {
      const timer = setTimeout(() => {
        setMessage("");
        if (state === "success" || state === "error") {
          setState("idle");
        }
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message, state]);

  const handleResult = (result: HybridTaskResult) => {
    if (result.success) {
      setMessage(result.message);
      setState("success");
      onTaskUpdate?.();
      setPendingConfirmation(null);
    } else if (result.requiresConfirmation) {
      setMessage(result.message);
      setState("confirmation");
      const confirmation = HybridTaskProcessor.getPendingConfirmation();
      if (confirmation) {
        setPendingConfirmation({
          taskTitle: confirmation.taskTitle,
          action: confirmation.action,
        });
      }
    } else {
      setMessage(result.message);
      setState("error");
      setPendingConfirmation(null);
    }
  };

  const processVoiceCommand = async (finalTranscript: string) => {
    setState("processing");
    setTranscript("");

    try {
      const result = HybridTaskProcessor.processCommand(finalTranscript);
      handleResult(result);
    } catch (error) {
      console.error("Error processing voice command:", error);
      setMessage("Sorry, I couldn't process that command. Please try again.");
      setState("error");
    }
  };

  const toggleListening = async () => {
    if (!isAvailable) {
      setMessage("Voice recognition not supported");
      setState("error");
      return;
    }

    if (state === "listening") {
      voiceService.stopListening();
      setState("idle");
      setTranscript("");
      return;
    }

    // Check microphone permission
    const hasPermission = await voiceService.requestMicrophonePermission();
    if (!hasPermission) {
      setMessage("Microphone access denied");
      setState("error");
      return;
    }

    const success = voiceService.startListening({
      onStart: () => {
        setState("listening");
        setTranscript("");
        setMessage("");
      },
      onResult: (text, isFinal) => {
        setTranscript(text);
        if (isFinal) {
          processVoiceCommand(text);
        }
      },
      onEnd: () => {
        // Only set to idle if we're not processing
        setState((currentState) =>
          currentState === "listening" || currentState === "processing"
            ? "idle"
            : currentState,
        );
      },
      onError: (errorMessage) => {
        setMessage(errorMessage);
        setState("error");
        setTranscript("");
      },
    });

    if (!success) {
      setMessage("Failed to start voice recognition");
      setState("error");
    }
  };

  const handleConfirmation = (confirmed: boolean) => {
    setState("processing");

    const result = HybridTaskProcessor.processCommand(confirmed ? "yes" : "no");
    handleResult(result);
  };

  const getButtonContent = () => {
    switch (state) {
      case "listening":
        return (
          <div className="relative">
            <MicOff className="w-5 h-5 text-white" />
            <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
          </div>
        );
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

  const getButtonStyle = () => {
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

  const getStatusText = () => {
    if (message) return message;
    if (transcript) return `"${transcript}"`;

    switch (state) {
      case "listening":
        return "Listening...";
      case "processing":
        return "Processing...";
      case "confirmation":
        return "Waiting for confirmation...";
      default:
        return "Voice Assistant";
    }
  };

  const getStatusIcon = () => {
    if (state === "success") return "✅";
    if (state === "error") return "❌";
    if (state === "processing") return "🧠";
    if (state === "listening") return "👂";
    if (state === "confirmation") return "❓";
    return "🎤";
  };

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "glass-thick rounded-2xl p-5 min-w-[300px] max-w-[400px]",
        "animate-float-gentle apple-card border border-border/30",
        "transition-all duration-500 ease-out",
        (state === "listening" || state === "processing") && "scale-105",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start space-x-3 mb-4">
        <button
          onClick={toggleListening}
          disabled={!isAvailable || state === "processing"}
          className={cn(
            "relative w-14 h-14 rounded-full transition-all duration-300",
            "flex items-center justify-center flex-shrink-0 fab",
            "haptic-medium shadow-glass",
            getButtonStyle(),
            (!isAvailable || state === "processing") &&
              "opacity-50 cursor-not-allowed",
          )}
        >
          {getButtonContent()}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-xl">{getStatusIcon()}</span>
            <span className="text-sm font-semibold text-foreground truncate font-display">
              Smart Voice Assistant
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Natural language • Exact task preservation
          </div>
        </div>
      </div>

      {/* Status Display */}
      <div className="glass-ultra-thin rounded-xl p-3 mb-4 border border-border/20">
        <div className="text-sm text-foreground leading-relaxed">
          {getStatusText()}
        </div>

        {state === "listening" && (
          <div className="flex space-x-1.5 mt-3">
            <div
              className="w-1 h-3 bg-primary rounded-full animate-bounce-gentle"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="w-1 h-4 bg-primary rounded-full animate-bounce-gentle"
              style={{ animationDelay: "200ms" }}
            />
            <div
              className="w-1 h-3 bg-primary rounded-full animate-bounce-gentle"
              style={{ animationDelay: "400ms" }}
            />
            <div
              className="w-1 h-5 bg-primary rounded-full animate-bounce-gentle"
              style={{ animationDelay: "600ms" }}
            />
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {state === "confirmation" && pendingConfirmation && (
        <div className="glass-thin rounded-xl p-4 mb-4 border border-warning/30 bg-warning/5">
          <div className="text-sm text-foreground mb-3">
            {pendingConfirmation.action === "delete" ? "Delete" : "Confirm"}{" "}
            task: "{pendingConfirmation.taskTitle}"?
          </div>
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant={
                pendingConfirmation.action === "delete"
                  ? "destructive"
                  : "default"
              }
              onClick={() => handleConfirmation(true)}
              className="flex-1 haptic-medium"
            >
              Yes,{" "}
              {pendingConfirmation.action === "delete" ? "Delete" : "Confirm"}
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

      {/* Voice Not Supported */}
      {!isAvailable && (
        <div className="glass-thin rounded-xl p-3 border border-destructive/30 bg-destructive/5">
          <div className="text-xs text-destructive flex items-center space-x-2 font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Voice recognition not supported</span>
          </div>
        </div>
      )}

      {/* Examples */}
      {state === "idle" && isAvailable && (
        <div className="pt-4 border-t border-border/30">
          <div className="text-xs text-muted-foreground leading-relaxed">
            <div className="font-medium text-foreground mb-2">Try saying:</div>
            <div className="space-y-1">
              <div>"Add task call my friend at 3 PM"</div>
              <div>"Mark call my friend as done"</div>
              <div>"Delete the call my friend task"</div>
              <div>"Create a task to buy groceries"</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
