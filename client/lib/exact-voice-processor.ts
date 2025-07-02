import { ExactTaskService, ExactTaskCommand } from "./exact-task-service";
import { voiceService } from "./voice-service";

export interface VoiceProcessingResult {
  success: boolean;
  message: string;
  command?: ExactTaskCommand;
  requiresConfirmation?: boolean;
  taskId?: string;
}

/**
 * Exact Voice Processor - Processes voice commands with exact text matching
 * No auto-correction, no intelligent interpretation, no assumptions
 */
export class ExactVoiceProcessor {
  private static pendingConfirmation: {
    taskId: string;
    taskTitle: string;
  } | null = null;

  /**
   * Process voice input with exact matching requirements
   */
  static processVoiceCommand(transcript: string): VoiceProcessingResult {
    const cleanTranscript = transcript.trim();

    if (!cleanTranscript) {
      return {
        success: false,
        message: "No voice input detected. Please try again.",
      };
    }

    // Handle pending confirmations
    if (this.pendingConfirmation) {
      return this.handleConfirmationResponse(cleanTranscript);
    }

    // Process new command
    const command = ExactTaskService.processExactCommand(cleanTranscript);

    if (command.success) {
      return {
        success: true,
        message: command.message,
        command,
      };
    } else if (command.requiresConfirmation && command.taskAffected) {
      // Set up confirmation
      this.pendingConfirmation = {
        taskId: command.taskAffected.id,
        taskTitle: command.taskAffected.title,
      };

      return {
        success: false,
        message: command.message,
        requiresConfirmation: true,
        taskId: command.taskAffected.id,
        command,
      };
    } else {
      return {
        success: false,
        message: command.message,
        command,
      };
    }
  }

  /**
   * Handle yes/no confirmation responses
   */
  private static handleConfirmationResponse(
    response: string,
  ): VoiceProcessingResult {
    const lowerResponse = response.toLowerCase().trim();
    const confirmation = this.pendingConfirmation;

    // Clear pending confirmation
    this.pendingConfirmation = null;

    if (!confirmation) {
      return {
        success: false,
        message: "No pending confirmation found.",
      };
    }

    // Check for affirmative responses
    if (this.isAffirmativeResponse(lowerResponse)) {
      const deleteResult = ExactTaskService.confirmDeleteTask(
        confirmation.taskId,
      );
      return {
        success: deleteResult.success,
        message: deleteResult.message,
        command: deleteResult,
      };
    }

    // Check for negative responses
    if (this.isNegativeResponse(lowerResponse)) {
      return {
        success: true,
        message: "Delete cancelled.",
      };
    }

    // Unclear response - ask again
    this.pendingConfirmation = confirmation; // Restore pending confirmation
    return {
      success: false,
      message: `Please say "yes" to delete "${confirmation.taskTitle}" or "no" to cancel.`,
      requiresConfirmation: true,
      taskId: confirmation.taskId,
    };
  }

  /**
   * Check if response is affirmative (yes)
   */
  private static isAffirmativeResponse(response: string): boolean {
    const affirmative = [
      "yes",
      "y",
      "yeah",
      "yep",
      "yup",
      "sure",
      "ok",
      "okay",
      "confirm",
      "delete",
      "do it",
      "go ahead",
      "proceed",
    ];
    return affirmative.includes(response);
  }

  /**
   * Check if response is negative (no)
   */
  private static isNegativeResponse(response: string): boolean {
    const negative = [
      "no",
      "n",
      "nope",
      "cancel",
      "stop",
      "abort",
      "nevermind",
      "never mind",
      "don't",
      "dont",
      "wait",
    ];
    return negative.includes(response);
  }

  /**
   * Clear any pending confirmations
   */
  static clearPendingConfirmation(): void {
    this.pendingConfirmation = null;
  }

  /**
   * Check if there's a pending confirmation
   */
  static hasPendingConfirmation(): boolean {
    return this.pendingConfirmation !== null;
  }

  /**
   * Get pending confirmation details
   */
  static getPendingConfirmation(): {
    taskId: string;
    taskTitle: string;
  } | null {
    return this.pendingConfirmation;
  }

  /**
   * Generate help message for voice commands
   */
  static getHelpMessage(): string {
    const examples = [
      'Say "Add task call my friend at 5 PM" to add exactly that task',
      'Say "Delete task call my friend at 5 PM" to delete that exact task',
      'Say "Complete task call my friend at 5 PM" to mark it done',
    ];

    return `Voice commands must be exact. ${examples.join(". ")}.`;
  }

  /**
   * Start listening for voice commands
   */
  static startListening(
    onResult: (result: VoiceProcessingResult) => void,
    onTranscript?: (transcript: string) => void,
  ): boolean {
    if (!voiceService.isSupported()) {
      onResult({
        success: false,
        message: "Voice recognition not supported in this browser.",
      });
      return false;
    }

    return voiceService.startListening({
      onResult: (transcript, isFinal) => {
        if (onTranscript) {
          onTranscript(transcript);
        }

        if (isFinal) {
          const result = this.processVoiceCommand(transcript);
          onResult(result);
        }
      },
      onError: (error) => {
        onResult({
          success: false,
          message: `Voice error: ${error}`,
        });
      },
    });
  }

  /**
   * Stop listening for voice commands
   */
  static stopListening(): void {
    voiceService.stopListening();
  }

  /**
   * Check if voice recognition is available
   */
  static isVoiceSupported(): boolean {
    return voiceService.isSupported();
  }

  /**
   * Check if currently listening
   */
  static isListening(): boolean {
    return voiceService.getIsListening();
  }
}
