import { useState, useEffect } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceAssistantProps {
  onTranscript?: (text: string) => void;
  className?: string;
}

export function VoiceAssistant({
  onTranscript,
  className,
}: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    // Check if speech recognition is available
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      setIsAvailable(true);
    }
  }, []);

  const toggleListening = () => {
    if (!isAvailable) return;

    if (isListening) {
      setIsListening(false);
      // Stop listening logic would go here
    } else {
      setIsListening(true);
      // Start listening logic would go here
      // For demo purposes, we'll simulate recognition after 2 seconds
      setTimeout(() => {
        setIsListening(false);
        onTranscript?.("Add a task to review the quarterly report");
      }, 2000);
    }
  };

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "glass rounded-2xl p-4",
        "animate-float",
        className,
      )}
    >
      <div className="flex items-center space-x-3">
        <button
          onClick={toggleListening}
          disabled={!isAvailable}
          className={cn(
            "relative w-12 h-12 rounded-full transition-all duration-300",
            "flex items-center justify-center",
            "shadow-lg hover:shadow-xl",
            isListening
              ? "mic-listening scale-110"
              : "bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600",
            !isAvailable && "opacity-50 cursor-not-allowed",
          )}
        >
          {isListening ? (
            <div className="relative">
              <MicOff className="w-5 h-5 text-white" />
              <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
            </div>
          ) : (
            <Mic className="w-5 h-5 text-white" />
          )}
        </button>

        {isListening && (
          <div className="flex items-center space-x-2 animate-slide-up">
            <div className="flex space-x-1">
              <div
                className="w-1 h-4 bg-purple-500 rounded-full animate-pulse"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-1 h-6 bg-purple-500 rounded-full animate-pulse"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-1 h-5 bg-purple-500 rounded-full animate-pulse"
                style={{ animationDelay: "300ms" }}
              />
              <div
                className="w-1 h-7 bg-purple-500 rounded-full animate-pulse"
                style={{ animationDelay: "450ms" }}
              />
            </div>
            <span className="text-sm text-purple-700 dark:text-purple-300 font-medium">
              Listening...
            </span>
          </div>
        )}

        {!isListening && (
          <div className="flex items-center space-x-2">
            <Volume2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm text-purple-700 dark:text-purple-300 font-medium whitespace-nowrap">
              Voice Assistant
            </span>
          </div>
        )}
      </div>

      {!isAvailable && (
        <div className="mt-2 text-xs text-red-500">
          Voice recognition not supported
        </div>
      )}
    </div>
  );
}
