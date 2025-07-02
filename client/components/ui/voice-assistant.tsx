import { useState, useEffect } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { voiceService } from "@/lib/voice-service";
import { SmartTaskAssistant } from "@/lib/smart-assistant";
import { ConfirmationDialog } from "./confirmation-dialog";
import { DisambiguationDialog } from "./disambiguation-dialog";
import { StorageService } from "@/lib/storage-service";
import { Task } from "./task-card";

interface VoiceAssistantProps {
  onTaskUpdate?: () => void;
  className?: string;
}

type AssistantState = "idle" | "listening" | "processing" | "success" | "error";

export function VoiceAssistant({
  onTaskUpdate,
  className,
}: VoiceAssistantProps) {
  const [state, setState] = useState<AssistantState>("idle");
  const [isAvailable, setIsAvailable] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  // Dialog states
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showDisambiguation, setShowDisambiguation] = useState(false);
  const [confirmationData, setConfirmationData] = useState<{
    task?: Task;
    action: "delete" | "modify";
    message: string;
    newContent?: string;
  } | null>(null);
  const [disambiguationData, setDisambiguationData] = useState<{
    tasks: Task[];
    query: string;
    action: "complete" | "delete" | "modify";
    message: string;
  } | null>(null);

  useEffect(() => {
    setIsAvailable(voiceService.isSupported());

    // Request microphone permission on component mount
    if (voiceService.isSupported()) {
      voiceService.requestMicrophonePermission();
    }
  }, []);

  useEffect(() => {
    // Clear feedback after 3 seconds
    if (feedback || error) {
      const timer = setTimeout(() => {
        setFeedback("");
        setError("");
        setState("idle");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback, error]);

  const processVoiceCommand = async (finalTranscript: string) => {
    setState("processing");
    setTranscript("");

    try {
      const result = await SmartTaskAssistant.processCommand(finalTranscript);

      if (result.success) {
        setFeedback(result.message);
        setState("success");
        onTaskUpdate?.();
      } else if (result.requiresConfirmation && result.taskAffected) {
        // Show confirmation dialog
        setConfirmationData({
          task: result.taskAffected,
          action: result.action as "delete" | "modify",
          message: result.message,
        });
        setShowConfirmation(true);
        setFeedback(result.message);
        setState("idle");
      } else if (result.requiresDisambiguation && result.candidateTasks) {
        // Show disambiguation dialog
        setDisambiguationData({
          tasks: result.candidateTasks,
          query: finalTranscript,
          action: result.action as "complete" | "delete" | "modify",
          message: result.message,
        });
        setShowDisambiguation(true);
        setFeedback(result.message);
        setState("idle");
      } else {
        setError(result.message);
        setState("error");
      }
    } catch (error) {
      console.error("Error processing voice command:", error);
      setError("Sorry, I couldn't process that command. Please try again.");
      setState("error");
    }
  };

  const toggleListening = async () => {
    if (!isAvailable) {
      setError("Voice recognition not supported");
      setState("error");
      return;
    }

    if (state === "listening") {
      voiceService.stopListening();
      setState("idle");
      return;
    }

    // Check microphone permission
    const hasPermission = await voiceService.requestMicrophonePermission();
    if (!hasPermission) {
      setError("Microphone access denied");
      setState("error");
      return;
    }

    const success = voiceService.startListening({
      onStart: () => {
        setState("listening");
        setTranscript("");
        setError("");
        setFeedback("");
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
        setError(errorMessage);
        setState("error");
        setTranscript("");
      },
    });

    if (!success) {
      setError("Failed to start voice recognition");
      setState("error");
    }
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
      default:
        return <Mic className="w-5 h-5 text-white" />;
    }
  };

  const getButtonStyle = () => {
    switch (state) {
      case "listening":
        return "voice-listening";
      case "processing":
        return "voice-processing";
      case "success":
        return "voice-success";
      case "error":
        return "voice-error";
      default:
        return "voice-idle apple-button";
    }
  };

  const getStatusText = () => {
    if (feedback) return feedback;
    if (error) return error;
    if (transcript) return `"${transcript}"`;

    switch (state) {
      case "listening":
        return "Listening...";
      case "processing":
        return "Processing...";
      default:
        return "Voice Assistant";
    }
  };

  const getStatusIcon = () => {
    if (state === "success") return "✅";
    if (state === "error") return "❌";
    if (state === "processing") return "🧠";
    if (state === "listening") return "���";
    return "🎙️";
  };

  // Dialog handlers
  const handleConfirmation = async (confirmed: boolean) => {
    if (confirmed && confirmationData) {
      try {
        const response = await SmartTaskAssistant.processCommand("yes");
        if (response.success) {
          setFeedback(response.message);
          setState("success");
          onTaskUpdate?.();
        } else {
          setError(response.message);
          setState("error");
        }
      } catch (error) {
        setError("Failed to process confirmation");
        setState("error");
      }
    } else {
      try {
        await SmartTaskAssistant.processCommand("no");
        setFeedback("Action cancelled");
        setState("idle");
      } catch (error) {
        // Silent fail for cancellation
      }
    }

    setShowConfirmation(false);
    setConfirmationData(null);
  };

  const handleDisambiguation = async (task: Task, index: number) => {
    try {
      const response = await SmartTaskAssistant.processCommand(
        (index + 1).toString(),
      );
      if (response.success) {
        setFeedback(response.message);
        setState("success");
        onTaskUpdate?.();
      } else if (response.requiresConfirmation) {
        setConfirmationData({
          task: response.taskAffected!,
          action: response.action as "delete" | "modify",
          message: response.message,
        });
        setShowConfirmation(true);
      } else {
        setError(response.message);
        setState("error");
      }
    } catch (error) {
      setError("Failed to process selection");
      setState("error");
    }

    setShowDisambiguation(false);
    setDisambiguationData(null);
  };

  const handleVoiceResponse = async (response: string) => {
    // Handle voice responses for confirmation dialogs
    try {
      const result = await SmartTaskAssistant.processCommand(response);
      if (result.success) {
        setFeedback(result.message);
        setState("success");
        onTaskUpdate?.();
        setShowConfirmation(false);
        setConfirmationData(null);
      }
    } catch (error) {
      // Continue with dialog
    }
  };

  return (
    <>
      {/* Main Voice Assistant */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "glass-thick rounded-2xl p-5 min-w-[220px] max-w-[380px]",
          "animate-float-gentle apple-card",
          "transition-all duration-500 ease-out",
          (state === "listening" || state === "processing") && "scale-105",
          className,
        )}
      >
        <div className="flex items-start space-x-3">
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

          <div className="flex-1 min-w-0 ml-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xl">{getStatusIcon()}</span>
              <span className="text-sm font-semibold text-foreground truncate font-display">
                Voice Assistant
              </span>
            </div>

            <div className="text-sm text-muted-foreground leading-relaxed font-medium">
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
        </div>

        {!isAvailable && (
          <div className="mt-4 pt-4 border-t border-border/30">
            <div className="text-xs text-destructive flex items-center space-x-2 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Voice recognition not supported</span>
            </div>
          </div>
        )}

        {state === "idle" && isAvailable && (
          <div className="mt-4 pt-4 border-t border-border/30">
            <div className="text-xs text-muted-foreground leading-relaxed">
              <div className="font-medium text-foreground mb-1">
                Try saying:
              </div>
              <div className="space-y-1">
                <div>"Add task: Buy groceries and call mom"</div>
                <div>"Mark Buy groceries as done"</div>
                <div>"Delete the Call dentist task"</div>
                <div>"Change Buy groceries to Buy organic groceries"</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {confirmationData && (
        <ConfirmationDialog
          isOpen={showConfirmation}
          onClose={() => {
            setShowConfirmation(false);
            setConfirmationData(null);
          }}
          onConfirm={handleConfirmation}
          task={confirmationData.task}
          action={confirmationData.action}
          message={confirmationData.message}
          newContent={confirmationData.newContent}
          onVoiceResponse={handleVoiceResponse}
        />
      )}

      {/* Disambiguation Dialog */}
      {disambiguationData && (
        <DisambiguationDialog
          isOpen={showDisambiguation}
          onClose={() => {
            setShowDisambiguation(false);
            setDisambiguationData(null);
          }}
          onSelect={handleDisambiguation}
          tasks={disambiguationData.tasks}
          query={disambiguationData.query}
          action={disambiguationData.action}
          message={disambiguationData.message}
        />
      )}
    </>
  );
}
