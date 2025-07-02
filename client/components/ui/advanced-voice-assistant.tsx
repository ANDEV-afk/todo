import { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Keyboard,
  Waves,
  Brain,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { enhancedVoiceService } from "@/lib/enhanced-voice-service";
import {
  SmartCommandProcessor,
  SmartCommandResult,
} from "@/lib/smart-command-processor";
import { Button } from "./button";
import { Input } from "./input";

interface AdvancedVoiceAssistantProps {
  onTaskUpdate?: () => void;
  onTaskCreate?: (taskContent: string) => void;
  className?: string;
}

type AssistantState =
  | "idle"
  | "listening"
  | "processing"
  | "confirmation"
  | "success"
  | "error"
  | "fallback";

export function AdvancedVoiceAssistant({
  onTaskUpdate,
  onTaskCreate,
  className,
}: AdvancedVoiceAssistantProps) {
  const [state, setState] = useState<AssistantState>("idle");
  const [transcript, setTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [message, setMessage] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [isAvailable, setIsAvailable] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [showFallback, setShowFallback] = useState(false);
  const [fallbackInput, setFallbackInput] = useState("");
  const [spokenReply, setSpokenReply] = useState("");

  const audioLevelRef = useRef<number>(0);
  const animationRef = useRef<number>();

  useEffect(() => {
    setIsAvailable(enhancedVoiceService.isSupported());

    // Request microphone permission on component mount
    if (enhancedVoiceService.isSupported()) {
      enhancedVoiceService.requestMicrophonePermission();
    }

    // Set up confidence and noise thresholds for better accuracy
    enhancedVoiceService.setConfidenceThreshold(0.7);
    enhancedVoiceService.setNoiseThreshold(0.01);
  }, []);

  useEffect(() => {
    // Audio level monitoring
    const updateAudioLevel = () => {
      if (state === "listening") {
        const level = enhancedVoiceService.getAudioLevel();
        setAudioLevel(level);
        audioLevelRef.current = level;
      }
      animationRef.current = requestAnimationFrame(updateAudioLevel);
    };

    if (state === "listening") {
      updateAudioLevel();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [state]);

  useEffect(() => {
    // Clear messages and transcripts after delay
    if (message && state !== "confirmation") {
      const timer = setTimeout(() => {
        setMessage("");
        setSpokenReply("");
        if (state === "success" || state === "error") {
          setState("idle");
          setTranscript("");
          setFinalTranscript("");
        }
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message, state]);

  const speakResponse = (text: string) => {
    if ("speechSynthesis" in window && text) {
      // Cancel any ongoing speech
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;

      // Use a pleasant voice if available
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (voice) =>
          voice.name.includes("Alex") ||
          voice.name.includes("Samantha") ||
          voice.name.includes("Daniel") ||
          voice.lang.startsWith("en-"),
      );

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      speechSynthesis.speak(utterance);
    }
  };

  const handleResult = (result: SmartCommandResult) => {
    console.log("🎯 Command result:", result);

    if (result.success && result.createEditableTask && result.taskContent) {
      setMessage(result.message);
      setState("success");
      onTaskCreate?.(result.taskContent);
      setSpokenReply(result.spokenReply || result.message);

      if (result.spokenReply) {
        speakResponse(result.spokenReply);
      }
    } else if (result.success) {
      setMessage(result.message);
      setState("success");
      onTaskUpdate?.();
      setSpokenReply(result.spokenReply || result.message);

      if (result.spokenReply) {
        speakResponse(result.spokenReply);
      }
    } else if (result.requiresConfirmation) {
      setMessage(result.message);
      setState("confirmation");
      setSpokenReply(result.spokenReply || result.message);

      if (result.spokenReply) {
        speakResponse(result.spokenReply);
      }
    } else {
      setMessage(result.message);
      setState("error");
      setSpokenReply(result.spokenReply || result.message);

      if (result.spokenReply) {
        speakResponse(result.spokenReply);
      }
    }

    setConfidence(result.confidence);
  };

  const processCommand = (command: string) => {
    setState("processing");
    setFinalTranscript(command);

    try {
      console.log("🧠 Processing command:", command);
      const result = SmartCommandProcessor.processCommand(command);
      handleResult(result);
    } catch (error) {
      console.error("Error processing command:", error);
      setMessage("Sorry, I couldn't process that command. Please try again.");
      setState("error");
      speakResponse(
        "Sorry, I couldn't process that command. Please try again.",
      );
    }
  };

  const toggleListening = async () => {
    if (!isAvailable) {
      setMessage("Voice recognition not supported");
      setState("error");
      speakResponse("Voice recognition is not supported in this browser.");
      return;
    }

    if (state === "listening") {
      enhancedVoiceService.stopListening();
      setState("idle");
      setTranscript("");
      return;
    }

    // Check microphone permission
    const hasPermission =
      await enhancedVoiceService.requestMicrophonePermission();
    if (!hasPermission) {
      setMessage("Microphone access denied");
      setState("error");
      speakResponse("I need microphone access to hear your commands.");
      return;
    }

    setState("listening");
    setMessage("Listening for your command...");
    setTranscript("");
    setFinalTranscript("");
    setConfidence(0);

    const success = enhancedVoiceService.startListening({
      onStart: () => {
        console.log("🎤 Started listening");
      },
      onResult: (text, isFinal, confidence) => {
        console.log("🎤 Voice result:", { text, isFinal, confidence });

        if (isFinal) {
          setFinalTranscript(text);
          processCommand(text);
        } else {
          setTranscript(text);
        }
        setConfidence(confidence);
      },
      onEnd: () => {
        console.log("🎤 Stopped listening");
        if (state === "listening") {
          setState("idle");
        }
      },
      onError: (error) => {
        console.error("🎤 Voice error:", error);
        setMessage(error);
        setState("error");
        setTranscript("");
        speakResponse("I had trouble hearing you. Please try again.");
      },
      continuous: false,
      interimResults: true,
      maxAlternatives: 3,
    });

    if (!success) {
      setMessage("Failed to start voice recognition");
      setState("error");
      speakResponse("I couldn't start listening. Please try again.");
    }
  };

  const handleFallbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fallbackInput.trim()) {
      processCommand(fallbackInput.trim());
      setFallbackInput("");
      setShowFallback(false);
    }
  };

  const getButtonContent = () => {
    switch (state) {
      case "listening":
        return (
          <div className="relative flex items-center justify-center">
            <MicOff className="w-6 h-6 text-white z-10" />
            <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
            <div
              className="absolute inset-0 rounded-full bg-white/10"
              style={{
                transform: `scale(${1 + audioLevel * 0.5})`,
                transition: "transform 0.1s ease-out",
              }}
            />
          </div>
        );
      case "processing":
        return (
          <div className="relative">
            <Brain className="w-6 h-6 text-white animate-pulse" />
          </div>
        );
      case "success":
        return <CheckCircle className="w-6 h-6 text-white" />;
      case "error":
        return <AlertCircle className="w-6 h-6 text-white" />;
      case "confirmation":
        return <MessageCircle className="w-6 h-6 text-white animate-bounce" />;
      default:
        return <Mic className="w-6 h-6 text-white" />;
    }
  };

  const getButtonStyle = () => {
    switch (state) {
      case "listening":
        return "voice-listening scale-110";
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
    if (
      spokenReply &&
      (state === "success" || state === "error" || state === "confirmation")
    ) {
      return spokenReply;
    }
    if (message) return message;
    if (finalTranscript) return `✓ "${finalTranscript}"`;
    if (transcript) return `🎤 "${transcript}"`;

    switch (state) {
      case "listening":
        return "Listening... Speak your command";
      case "processing":
        return "Processing your command...";
      case "confirmation":
        return "Waiting for your confirmation...";
      default:
        return "Voice Assistant Ready";
    }
  };

  const getStatusIcon = () => {
    if (state === "success") return "✅";
    if (state === "error") return "❌";
    if (state === "processing") return "🧠";
    if (state === "listening") return "👂";
    if (state === "confirmation") return "❓";
    return "🎙️";
  };

  const getConfidenceColor = () => {
    if (confidence >= 0.8) return "text-success";
    if (confidence >= 0.6) return "text-warning";
    return "text-destructive";
  };

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "glass-thick rounded-3xl p-6 min-w-[360px] max-w-[450px]",
        "animate-float-gentle apple-card border border-border/30",
        "transition-all duration-500 ease-out",
        (state === "listening" || state === "processing") &&
          "scale-105 shadow-2xl",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start space-x-4 mb-4">
        <button
          onClick={toggleListening}
          disabled={!isAvailable || state === "processing"}
          className={cn(
            "relative w-16 h-16 rounded-full transition-all duration-300",
            "flex items-center justify-center flex-shrink-0 fab",
            "haptic-heavy shadow-glass hover:shadow-glass-lg",
            getButtonStyle(),
            (!isAvailable || state === "processing") &&
              "opacity-50 cursor-not-allowed",
          )}
        >
          {getButtonContent()}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-2xl">{getStatusIcon()}</span>
            <span className="text-sm font-semibold text-foreground font-display">
              Smart Voice Assistant
            </span>
            {confidence > 0 && (
              <span className={cn("text-xs font-medium", getConfidenceColor())}>
                {Math.round(confidence * 100)}%
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Apple Siri-like experience • Noise filtering • Real-time preview
          </div>
        </div>
      </div>

      {/* Status Display */}
      <div className="glass-ultra-thin rounded-xl p-4 mb-4 border border-border/20">
        <div className="text-sm text-foreground leading-relaxed min-h-[40px] flex items-center">
          {getStatusText()}
        </div>

        {/* Real-time voice visualization */}
        {state === "listening" && (
          <div className="flex items-center justify-center space-x-1 mt-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="bg-primary rounded-full transition-all duration-100"
                style={{
                  width: "3px",
                  height: `${8 + audioLevel * 20 + Math.sin(Date.now() / 200 + i) * 4}px`,
                  opacity: 0.7 + audioLevel * 0.3,
                  animationDelay: `${i * 100}ms`,
                }}
              />
            ))}
          </div>
        )}

        {/* Processing indicator */}
        {state === "processing" && (
          <div className="flex items-center justify-center mt-3">
            <div className="flex space-x-1">
              <div
                className="w-2 h-2 bg-info rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-2 h-2 bg-info rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-2 h-2 bg-info rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowFallback(!showFallback)}
            className="apple-button haptic-light"
          >
            <Keyboard className="w-3.5 h-3.5 mr-1.5" />
            Type
          </Button>

          {spokenReply && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => speakResponse(spokenReply)}
              className="apple-button haptic-light"
            >
              <Volume2 className="w-3.5 h-3.5 mr-1.5" />
              Repeat
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          {isAvailable ? "Ready" : "Not supported"}
        </div>
      </div>

      {/* Fallback Text Input */}
      {showFallback && (
        <form
          onSubmit={handleFallbackSubmit}
          className="mt-4 pt-4 border-t border-border/30"
        >
          <div className="flex space-x-2">
            <Input
              value={fallbackInput}
              onChange={(e) => setFallbackInput(e.target.value)}
              placeholder="Type your command..."
              className="flex-1 text-sm"
              disabled={state === "processing"}
            />
            <Button
              type="submit"
              size="sm"
              disabled={!fallbackInput.trim() || state === "processing"}
              className="apple-button haptic-medium"
            >
              Send
            </Button>
          </div>
        </form>
      )}

      {/* Voice Not Supported */}
      {!isAvailable && (
        <div className="mt-4 pt-4 border-t border-border/30">
          <div className="glass-thin rounded-xl p-3 border border-destructive/30 bg-destructive/5">
            <div className="text-xs text-destructive flex items-center space-x-2 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Voice recognition not supported in this browser</span>
            </div>
          </div>
        </div>
      )}

      {/* Examples */}
      {state === "idle" && isAvailable && !showFallback && (
        <div className="mt-4 pt-4 border-t border-border/30">
          <div className="text-xs text-muted-foreground leading-relaxed">
            <div className="font-medium text-foreground mb-2">Try saying:</div>
            <div className="space-y-1">
              <div>"Add task to buy milk"</div>
              <div>"Mark call mom as done"</div>
              <div>"Delete the meeting task"</div>
              <div>"Show my tasks"</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
