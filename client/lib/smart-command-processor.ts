import { StorageService } from "./storage-service";
import { Task, TaskStatus } from "@/components/ui/task-card";

export interface SmartCommandResult {
  success: boolean;
  message: string;
  action?: "add" | "complete" | "delete" | "modify" | "list";
  requiresConfirmation?: boolean;
  taskAffected?: Task;
  taskContent?: string;
  confidence: number;
  alternatives?: string[];
  createEditableTask?: boolean;
  spokenReply?: string;
}

export interface ParsedIntent {
  action: "add" | "complete" | "delete" | "modify" | "list" | "unknown";
  content: string;
  taskIdentifier?: string | number;
  confidence: number;
  keywords: string[];
}

export class SmartCommandProcessor {
  private static pendingConfirmation: {
    taskId: string;
    taskTitle: string;
    action: string;
  } | null = null;

  /**
   * Process command with intelligent parsing and contextual understanding
   */
  static processCommand(
    input: string,
    alternatives: string[] = [],
  ): SmartCommandResult {
    const cleanInput = input.trim();

    if (!cleanInput) {
      return {
        success: false,
        message: "Please provide a command.",
        confidence: 0,
        spokenReply: "I didn't hear anything. Please try again.",
      };
    }

    // Handle pending confirmations
    if (this.pendingConfirmation) {
      return this.handleConfirmationResponse(cleanInput);
    }

    // Parse intent with contextual understanding
    const intent = this.parseIntentWithContext(cleanInput, alternatives);

    // Execute based on detected intent
    switch (intent.action) {
      case "add":
        return this.executeAddTask(intent);
      case "complete":
        return this.executeCompleteTask(intent);
      case "delete":
        return this.executeDeleteTask(intent);
      case "modify":
        return this.executeModifyTask(intent);
      case "list":
        return this.executeListTasks(intent);
      default:
        return this.generateHelpResponse(cleanInput);
    }
  }

  /**
   * Parse intent with contextual keyword detection and confidence scoring
   */
  private static parseIntentWithContext(
    input: string,
    alternatives: string[] = [],
  ): ParsedIntent {
    const lower = input.toLowerCase();
    const allInputs = [input, ...alternatives];

    // Define action keywords with weights
    const actionKeywords = {
      add: {
        primary: ["add", "create", "new", "make"],
        secondary: ["remind", "note", "task"],
        phrases: ["remind me to", "i need to", "don't forget to"],
        weight: 1.0,
      },
      complete: {
        primary: ["mark", "complete", "finish", "done"],
        secondary: ["check", "tick", "finished"],
        phrases: ["mark as done", "is done", "completed"],
        weight: 0.9,
      },
      delete: {
        primary: ["delete", "remove", "cancel"],
        secondary: ["clear", "erase", "drop"],
        phrases: ["get rid of", "take away"],
        weight: 0.8,
      },
      modify: {
        primary: ["edit", "change", "update", "modify"],
        secondary: ["alter", "revise", "fix"],
        phrases: ["change to", "update to"],
        weight: 0.7,
      },
      list: {
        primary: ["list", "show", "display"],
        secondary: ["view", "see"],
        phrases: ["what tasks", "show me"],
        weight: 0.6,
      },
    };

    let bestMatch = { action: "unknown" as const, confidence: 0, keywords: [] };

    // Analyze each potential action
    for (const [action, config] of Object.entries(actionKeywords)) {
      let confidence = 0;
      const foundKeywords: string[] = [];

      // Check primary keywords
      for (const keyword of config.primary) {
        if (lower.includes(keyword)) {
          confidence += config.weight * 0.6;
          foundKeywords.push(keyword);
        }
      }

      // Check secondary keywords
      for (const keyword of config.secondary) {
        if (lower.includes(keyword)) {
          confidence += config.weight * 0.3;
          foundKeywords.push(keyword);
        }
      }

      // Check phrase patterns
      for (const phrase of config.phrases) {
        if (lower.includes(phrase)) {
          confidence += config.weight * 0.8;
          foundKeywords.push(phrase);
        }
      }

      // Boost confidence if found in multiple alternatives
      const alternativeMatches = allInputs.filter((alt) =>
        config.primary.some((kw) => alt.toLowerCase().includes(kw)),
      ).length;
      if (alternativeMatches > 1) {
        confidence += 0.2;
      }

      if (confidence > bestMatch.confidence) {
        bestMatch = {
          action: action as any,
          confidence,
          keywords: foundKeywords,
        };
      }
    }

    // Extract content based on detected action
    const content = this.extractContent(
      input,
      bestMatch.action,
      bestMatch.keywords,
    );

    return {
      action: bestMatch.action,
      content,
      confidence: bestMatch.confidence,
      keywords: bestMatch.keywords,
    };
  }

  /**
   * Extract task content from command based on detected action
   */
  private static extractContent(
    input: string,
    action: string,
    keywords: string[],
  ): string {
    let content = input;

    // Remove action keywords and common phrases
    const removePatterns = [
      // Add patterns
      /^(?:add|create|new|make)\s+(?:a\s+|the\s+)?(?:task\s+)?(?:to\s+|for\s+)?/i,
      /^(?:remind\s+me\s+to\s+|i\s+need\s+to\s+|don't\s+forget\s+to\s+)/i,

      // Complete patterns
      /^(?:mark|complete|finish)\s+(?:task\s+)?(?:number\s+\d+\s+)?(?:as\s+)?(?:done|complete|finished)?/i,
      /^(?:task\s+)?(?:number\s+\d+\s+)?(?:is\s+)?(?:done|complete|finished)$/i,

      // Delete patterns
      /^(?:delete|remove|cancel)\s+(?:task\s+)?(?:number\s+\d+\s+)?/i,

      // Modify patterns
      /^(?:edit|change|update|modify)\s+(?:task\s+)?(?:number\s+\d+\s+)?(?:to\s+)?/i,
    ];

    for (const pattern of removePatterns) {
      content = content.replace(pattern, "").trim();
    }

    // Clean up common trailing words
    content = content.replace(/\s+(?:please|thanks|thank you)$/i, "");

    // Extract quoted content if present
    const quotedMatch = content.match(/["']([^"']+)["']/);
    if (quotedMatch) {
      content = quotedMatch[1];
    }

    return content.trim();
  }

  /**
   * Execute add task command
   */
  private static executeAddTask(intent: ParsedIntent): SmartCommandResult {
    if (!intent.content) {
      return {
        success: false,
        message: "Please specify what task to add.",
        confidence: intent.confidence,
        spokenReply: "What task would you like me to add?",
      };
    }

    return {
      success: true,
      message: `Creating task: "${intent.content}"`,
      action: "add",
      taskContent: intent.content,
      confidence: intent.confidence,
      createEditableTask: true,
      spokenReply: `Added task: ${intent.content}`,
    };
  }

  /**
   * Execute complete task command with intelligent task matching
   */
  private static executeCompleteTask(intent: ParsedIntent): SmartCommandResult {
    if (!intent.content) {
      return {
        success: false,
        message: "Please specify which task to complete.",
        confidence: intent.confidence,
        spokenReply: "Which task would you like to mark as done?",
      };
    }

    const tasks = StorageService.getTasks();
    const matchingTask = this.findBestTaskMatch(intent.content, tasks);

    if (!matchingTask) {
      const availableTasks = tasks
        .filter((t) => t.status !== "completed")
        .slice(0, 3)
        .map((t) => `"${t.title}"`)
        .join(", ");

      return {
        success: false,
        message: `No task found matching: "${intent.content}". Available tasks: ${availableTasks}`,
        confidence: intent.confidence,
        spokenReply: `I couldn't find that task. Your current tasks are: ${availableTasks}`,
      };
    }

    if (matchingTask.status === "completed") {
      return {
        success: false,
        message: `Task "${matchingTask.title}" is already completed.`,
        confidence: intent.confidence,
        spokenReply: `That task is already done.`,
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
          confidence: intent.confidence,
          spokenReply: `Marked "${matchingTask.title}" as done. Great job!`,
        };
      } else {
        throw new Error("Update failed");
      }
    } catch (error) {
      return {
        success: false,
        message: "Failed to complete task. Please try again.",
        confidence: intent.confidence,
        spokenReply: "Sorry, I couldn't complete that task. Please try again.",
      };
    }
  }

  /**
   * Execute delete task command with confirmation
   */
  private static executeDeleteTask(intent: ParsedIntent): SmartCommandResult {
    if (!intent.content) {
      return {
        success: false,
        message: "Please specify which task to delete.",
        confidence: intent.confidence,
        spokenReply: "Which task would you like to delete?",
      };
    }

    const tasks = StorageService.getTasks();
    const matchingTask = this.findBestTaskMatch(intent.content, tasks);

    if (!matchingTask) {
      const availableTasks = tasks
        .slice(0, 3)
        .map((t) => `"${t.title}"`)
        .join(", ");

      return {
        success: false,
        message: `No task found matching: "${intent.content}". Available tasks: ${availableTasks}`,
        confidence: intent.confidence,
        spokenReply: `I couldn't find that task. Your tasks are: ${availableTasks}`,
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
      confidence: intent.confidence,
      spokenReply: `Are you sure you want to delete "${matchingTask.title}"? Say yes to confirm or no to cancel.`,
    };
  }

  /**
   * Execute modify task command
   */
  private static executeModifyTask(intent: ParsedIntent): SmartCommandResult {
    return {
      success: false,
      message: "Task modification is coming soon!",
      confidence: intent.confidence,
      spokenReply: "Task editing is not yet available, but it's coming soon!",
    };
  }

  /**
   * Execute list tasks command
   */
  private static executeListTasks(intent: ParsedIntent): SmartCommandResult {
    const tasks = StorageService.getTasks();
    const pendingTasks = tasks.filter((t) => t.status !== "completed");

    if (pendingTasks.length === 0) {
      return {
        success: true,
        message: "You have no pending tasks. Great job!",
        action: "list",
        confidence: intent.confidence,
        spokenReply: "You have no pending tasks. You're all caught up!",
      };
    }

    const taskList = pendingTasks
      .slice(0, 5)
      .map((t, i) => `${i + 1}. ${t.title}`)
      .join(", ");

    return {
      success: true,
      message: `Your tasks: ${taskList}`,
      action: "list",
      confidence: intent.confidence,
      spokenReply: `You have ${pendingTasks.length} tasks: ${taskList}`,
    };
  }

  /**
   * Find best matching task using fuzzy matching
   */
  private static findBestTaskMatch(query: string, tasks: Task[]): Task | null {
    if (!query || !tasks.length) return null;

    const queryLower = query.toLowerCase();

    // Exact match first
    let bestMatch = tasks.find(
      (task) => task.title.toLowerCase() === queryLower,
    );

    if (bestMatch) return bestMatch;

    // Partial match
    bestMatch = tasks.find((task) =>
      task.title.toLowerCase().includes(queryLower),
    );

    if (bestMatch) return bestMatch;

    // Word-based matching
    const queryWords = queryLower.split(" ").filter((w) => w.length > 2);
    if (queryWords.length > 0) {
      bestMatch = tasks.find((task) => {
        const taskTitle = task.title.toLowerCase();
        return queryWords.some((word) => taskTitle.includes(word));
      });
    }

    return bestMatch || null;
  }

  /**
   * Handle confirmation responses
   */
  private static handleConfirmationResponse(input: string): SmartCommandResult {
    const lowerResponse = input.toLowerCase().trim();
    const confirmation = this.pendingConfirmation;

    this.pendingConfirmation = null;

    if (!confirmation) {
      return {
        success: false,
        message: "No pending confirmation found.",
        confidence: 0.5,
        spokenReply: "I'm not sure what you're confirming.",
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
              confidence: 0.9,
              spokenReply: `Deleted "${confirmation.taskTitle}".`,
            };
          } else {
            throw new Error("Delete failed");
          }
        } catch (error) {
          return {
            success: false,
            message: "Failed to delete task. Please try again.",
            confidence: 0.5,
            spokenReply: "Sorry, I couldn't delete that task.",
          };
        }
      }
    }

    // Check for negative responses
    if (this.isNegativeResponse(lowerResponse)) {
      return {
        success: true,
        message: "Action cancelled.",
        confidence: 0.9,
        spokenReply: "Okay, I cancelled that action.",
      };
    }

    // Unclear response - restore confirmation
    this.pendingConfirmation = confirmation;
    return {
      success: false,
      message: `Please say "yes" to delete "${confirmation.taskTitle}" or "no" to cancel.`,
      requiresConfirmation: true,
      confidence: 0.3,
      spokenReply: "Please say yes to confirm or no to cancel.",
    };
  }

  /**
   * Generate helpful response for unknown commands
   */
  private static generateHelpResponse(input: string): SmartCommandResult {
    const examples = [
      "Add task to buy groceries",
      "Mark call mom as done",
      "Delete the meeting task",
      "Show my tasks",
    ];

    return {
      success: false,
      message: `I didn't understand "${input}". Try: ${examples.join(", ")}`,
      confidence: 0,
      spokenReply:
        "I didn't understand that. Try saying 'Add task' followed by what you want to do, or 'Mark' and the task name 'as done'.",
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
      "right",
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
      "back",
    ];
    return negative.includes(response);
  }

  /**
   * Clear pending confirmations
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
}
