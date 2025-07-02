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
import { GeminiService } from "@/lib/gemini-service";
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
      const command = await GeminiService.parseVoiceCommand(finalTranscript);

      switch (command.type) {
        case "task":
        case "reminder":
        case "meeting":
        case "note":
          const newTask: Omit<Task, "id"> = {
            title: command.title,
            description: command.description,
            priority: command.priority || "medium",
            status: "pending",
            dueDate:
              command.date && command.time
                ? new Date(`${command.date}T${command.time}`)
                : command.date
                  ? new Date(command.date)
                  : undefined,
            tags: [command.type],
          };

          StorageService.addTask(newTask);
          setFeedback(`✅ Added ${command.type}: "${command.title}"`);
          setState("success");
          onTaskUpdate?.();
          break;

        case "complete":
          // Mark the most recent task as complete if no specific task mentioned
          const pendingTasks = StorageService.getTasksByStatus("pending");
          if (pendingTasks.length > 0) {
            const taskToComplete = pendingTasks[0];
            StorageService.updateTaskStatus(taskToComplete.id, "completed");
            setFeedback(`✅ Marked "${taskToComplete.title}" as complete`);
            setState("success");
            onTaskUpdate?.();
          } else {
            setError("No pending tasks to complete");
            setState("error");
          }
          break;

        case "delete":
          // Delete the most recent task if no specific task mentioned
          const allTasks = StorageService.getTasks();
          if (allTasks.length > 0) {
            const taskToDelete = allTasks[0];
            StorageService.deleteTask(taskToDelete.id);
            setFeedback(`🗑️ Deleted "${taskToDelete.title}"`);
            setState("success");
            onTaskUpdate?.();
          } else {
            setError("No tasks to delete");
            setState("error");
          }
          break;

        default:
          setError("Sorry, I didn't understand that command");
          setState("error");
      }
    } catch (error) {
      console.error("Error processing voice command:", error);
      setError("Failed to process voice command");
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
        if (state === "listening") {
          setState("idle");
        }
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
        return "mic-listening scale-110";
      case "processing":
        return "bg-gradient-to-r from-blue-500 to-cyan-500 scale-105";
      case "success":
        return "bg-gradient-to-r from-green-500 to-emerald-500 scale-105";
      case "error":
        return "bg-gradient-to-r from-red-500 to-pink-500 scale-105";
      default:
        return "bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600";
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
    if (state === "listening") return "🎤";
    return "🎙️";
  };

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "glass rounded-2xl p-4 min-w-[200px] max-w-[350px]",
        "animate-float",
        "transition-all duration-300",
        (state === "listening" || state === "processing") && "scale-105",
        className,
      )}
    >
      <div className="flex items-start space-x-3">
        <button
          onClick={toggleListening}
          disabled={!isAvailable || state === "processing"}
          className={cn(
            "relative w-12 h-12 rounded-full transition-all duration-300",
            "flex items-center justify-center flex-shrink-0",
            "shadow-lg hover:shadow-xl",
            getButtonStyle(),
            (!isAvailable || state === "processing") &&
              "opacity-50 cursor-not-allowed",
          )}
        >
          {getButtonContent()}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-lg">{getStatusIcon()}</span>
            <span className="text-sm font-medium text-foreground truncate">
              Voice Assistant
            </span>
          </div>

          <div className="text-xs text-muted-foreground leading-tight">
            {getStatusText()}
          </div>

          {state === "listening" && (
            <div className="flex space-x-1 mt-2">
              <div
                className="w-1 h-3 bg-purple-500 rounded-full animate-pulse"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-1 h-4 bg-purple-500 rounded-full animate-pulse"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-1 h-3 bg-purple-500 rounded-full animate-pulse"
                style={{ animationDelay: "300ms" }}
              />
              <div
                className="w-1 h-5 bg-purple-500 rounded-full animate-pulse"
                style={{ animationDelay: "450ms" }}
              />
            </div>
          )}
        </div>
      </div>

      {!isAvailable && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="text-xs text-red-500 flex items-center space-x-1">
            <AlertCircle className="w-3 h-3" />
            <span>Voice recognition not supported</span>
          </div>
        </div>
      )}

      {state === "idle" && isAvailable && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="text-xs text-muted-foreground">
            Try: "Add task", "Remind me to...", "Schedule meeting", "Mark
            complete"
          </div>
        </div>
      )}
    </div>
  );
}
