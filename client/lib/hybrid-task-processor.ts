import { StorageService } from "./storage-service";
import { Task, TaskStatus } from "@/components/ui/task-card";

export interface HybridTaskResult {
  success: boolean;
  message: string;
  action?: "add" | "complete" | "delete";
  requiresConfirmation?: boolean;
  taskAffected?: Task;
  exactText?: string;
  createEditableTask?: boolean;
  taskContent?: string;
}

/**
 * Hybrid Task Processor - Natural language command understanding with exact text preservation
 * Understands natural language but preserves task content exactly as spoken
 */
export class HybridTaskProcessor {
  private static pendingConfirmation: {
    taskId: string;
    taskTitle: string;
    action: string;
  } | null = null;

  /**
   * Process natural language command but preserve exact task content
   */
  static processCommand(input: string): HybridTaskResult {
    const cleanInput = input.trim();

    if (!cleanInput) {
      return {
        success: false,
        message: "Please provide a command.",
      };
    }

    // Handle pending confirmations first
    if (this.pendingConfirmation) {
      return this.handleConfirmationResponse(cleanInput);
    }

    // Parse natural language command
    const intent = this.parseNaturalLanguageIntent(cleanInput);

    switch (intent.type) {
      case "add":
        return this.executeAddTask(intent.exactContent, cleanInput);
      case "complete":
        return this.executeCompleteTask(intent.exactContent, cleanInput);
      case "delete":
        return this.executeDeleteTask(intent.exactContent, cleanInput);
      default:
        return {
          success: false,
          message:
            "I didn't understand that. Try saying something like 'Add task call my friend at 3 PM' or 'Mark call my friend as done'.",
        };
    }
  }

  /**
   * Parse natural language to extract intent and exact task content
   */
  private static parseNaturalLanguageIntent(input: string) {
    const lower = input.toLowerCase();

    // Add task patterns - extract exact content after command indicators
    const addPatterns = [
      // "add task [content]" or "add the task [content]"
      /(?:add|create|new)\s+(?:a\s+|the\s+)?task\s+(.+)/i,
      // "add the command create the task of [content]"
      /add\s+(?:the\s+)?command\s+create\s+(?:the\s+)?task\s+(?:of\s+)?(.+)/i,
      // "create a task [content]"
      /create\s+(?:a\s+|the\s+)?task\s+(?:for\s+|to\s+)?(.+)/i,
      // "remind me to [content]"
      /remind\s+me\s+to\s+(.+)/i,
      // "I need to [content]"
      /i\s+need\s+to\s+(.+)/i,
      // Simple "add [content]"
      /^add\s+(.+)/i,
    ];

    // Complete task patterns
    const completePatterns = [
      // "mark [content] as done/complete"
      /(?:mark|complete|finish)\s+(.+?)\s+as\s+(?:done|complete|finished)/i,
      // "complete task [content]"
      /(?:complete|finish|mark)\s+(?:the\s+)?task\s+(.+)/i,
      // "mark [content] complete"
      /mark\s+(.+?)\s+(?:complete|done|finished)/i,
      // "[content] is done"
      /(.+?)\s+is\s+(?:done|complete|finished)/i,
      // "complete [content]"
      /(?:complete|finish)\s+(.+)/i,
    ];

    // Delete task patterns
    const deletePatterns = [
      // "delete task [content]"
      /(?:delete|remove|cancel)\s+(?:the\s+)?task\s+(.+)/i,
      // "delete [content]"
      /(?:delete|remove|cancel)\s+(.+)/i,
      // "remove the [content] task"
      /remove\s+(?:the\s+)?(.+?)\s+task/i,
    ];

    // Check add patterns
    for (const pattern of addPatterns) {
      const match = input.match(pattern);
      if (match && match[1].trim()) {
        return {
          type: "add" as const,
          exactContent: match[1].trim(),
        };
      }
    }

    // Check complete patterns
    for (const pattern of completePatterns) {
      const match = input.match(pattern);
      if (match && match[1].trim()) {
        return {
          type: "complete" as const,
          exactContent: match[1].trim(),
        };
      }
    }

    // Check delete patterns
    for (const pattern of deletePatterns) {
      const match = input.match(pattern);
      if (match && match[1].trim()) {
        return {
          type: "delete" as const,
          exactContent: match[1].trim(),
        };
      }
    }

    return { type: "unknown" as const };
  }

  /**
   * Execute add task with exact content preservation - triggers immediate editable card
   */
  private static executeAddTask(
    exactContent: string,
    originalCommand: string,
  ): HybridTaskResult {
    try {
      // Return immediately to trigger editable card creation
      return {
        success: true,
        message: `Creating task: "${exactContent}"`,
        action: "add",
        exactText: exactContent,
        createEditableTask: true,
        taskContent: exactContent,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to add task. Please try again.",
      };
    }
  }

  /**
   * Execute complete task with exact text matching
   */
  private static executeCompleteTask(
    exactContent: string,
    originalCommand: string,
  ): HybridTaskResult {
    const tasks = StorageService.getTasks();

    // Find exact match first
    let matchingTask = tasks.find(
      (task) => task.title.toLowerCase() === exactContent.toLowerCase(),
    );

    // If no exact match, try partial match
    if (!matchingTask) {
      matchingTask = tasks.find((task) =>
        task.title.toLowerCase().includes(exactContent.toLowerCase()),
      );
    }

    if (!matchingTask) {
      return {
        success: false,
        message: `No task found matching: "${exactContent}". Available tasks: ${tasks
          .map((t) => `"${t.title}"`)
          .join(", ")}`,
      };
    }

    if (matchingTask.status === "completed") {
      return {
        success: false,
        message: `Task "${matchingTask.title}" is already completed.`,
        taskAffected: matchingTask,
      };
    }

    try {
      const success = StorageService.updateTaskStatus(
        matchingTask.id,
        "completed",
      );

      if (success) {
        return {
          success: true,
          message: `Completed task: "${matchingTask.title}"`,
          action: "complete",
          taskAffected: matchingTask,
          exactText: matchingTask.title,
        };
      } else {
        throw new Error("Update failed");
      }
    } catch (error) {
      return {
        success: false,
        message: "Failed to complete task. Please try again.",
        taskAffected: matchingTask,
      };
    }
  }

  /**
   * Execute delete task with exact text matching and confirmation
   */
  private static executeDeleteTask(
    exactContent: string,
    originalCommand: string,
  ): HybridTaskResult {
    const tasks = StorageService.getTasks();

    // Find exact match first
    let matchingTask = tasks.find(
      (task) => task.title.toLowerCase() === exactContent.toLowerCase(),
    );

    // If no exact match, try partial match
    if (!matchingTask) {
      matchingTask = tasks.find((task) =>
        task.title.toLowerCase().includes(exactContent.toLowerCase()),
      );
    }

    if (!matchingTask) {
      return {
        success: false,
        message: `No task found matching: "${exactContent}". Available tasks: ${tasks
          .map((t) => `"${t.title}"`)
          .join(", ")}`,
      };
    }

    // Set up confirmation
    this.pendingConfirmation = {
      taskId: matchingTask.id,
      taskTitle: matchingTask.title,
      action: "delete",
    };

    return {
      success: false,
      message: `Are you sure you want to delete: "${matchingTask.title}"? Say 'yes' to confirm or 'no' to cancel.`,
      requiresConfirmation: true,
      taskAffected: matchingTask,
      exactText: matchingTask.title,
    };
  }

  /**
   * Handle confirmation responses
   */
  private static handleConfirmationResponse(input: string): HybridTaskResult {
    const lowerResponse = input.toLowerCase().trim();
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
      if (confirmation.action === "delete") {
        try {
          const success = StorageService.deleteTask(confirmation.taskId);
          if (success) {
            return {
              success: true,
              message: `Deleted task: "${confirmation.taskTitle}"`,
              action: "delete",
              exactText: confirmation.taskTitle,
            };
          } else {
            throw new Error("Delete failed");
          }
        } catch (error) {
          return {
            success: false,
            message: "Failed to delete task. Please try again.",
          };
        }
      }
    }

    // Check for negative responses
    if (this.isNegativeResponse(lowerResponse)) {
      return {
        success: true,
        message: "Action cancelled.",
      };
    }

    // Unclear response - restore confirmation and ask again
    this.pendingConfirmation = confirmation;
    return {
      success: false,
      message: `Please say "yes" to delete "${confirmation.taskTitle}" or "no" to cancel.`,
      requiresConfirmation: true,
    };
  }

  /**
   * Check if response is affirmative
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
   * Check if response is negative
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
    action: string;
  } | null {
    return this.pendingConfirmation;
  }
}
