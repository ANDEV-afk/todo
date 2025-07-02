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
   * Execute complete task command with confirmation for security
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

    const tasks = StorageService.getTasks().filter(
      (t) => t.status !== "completed",
    );
    const matchingTask = this.findBestTaskMatch(intent.content, tasks);

    if (!matchingTask) {
      const availableTasks = tasks
        .slice(0, 3)
        .map((t, i) => `${i + 1}. "${t.title}"`)
        .join(", ");

      return {
        success: false,
        message: `No task found matching: "${intent.content}". Available tasks: ${availableTasks}`,
        confidence: intent.confidence,
        spokenReply: availableTasks
          ? `I couldn't find that task. Your current tasks are: ${availableTasks}`
          : "I couldn't find that task. You have no pending tasks.",
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

    // Set up confirmation for mark as done
    this.pendingConfirmation = {
      taskId: matchingTask.id,
      taskTitle: matchingTask.title,
      action: "complete",
    };

    return {
      success: false,
      message: `Are you sure you want to mark "${matchingTask.title}" as done? Say 'yes' to confirm or 'no' to cancel.`,
      requiresConfirmation: true,
      taskAffected: matchingTask,
      confidence: intent.confidence,
      spokenReply: `Are you sure you want to mark "${matchingTask.title}" as done? Say yes to confirm or no to cancel.`,
    };
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
   * Find best matching task using number or fuzzy text matching
   */
  private static findBestTaskMatch(query: string, tasks: Task[]): Task | null {
    if (!query || !tasks.length) return null;

    const queryLower = query.toLowerCase().trim();

    // Check for task number patterns
    const numberMatch = queryLower.match(/(?:task\s+)?(?:number\s+)?(\d+)/);
    if (numberMatch) {
      const taskNumber = parseInt(numberMatch[1]);
      const taskIndex = taskNumber - 1; // Convert to 0-based index

      if (taskIndex >= 0 && taskIndex < tasks.length) {
        return tasks[taskIndex];
      }
    }

    // Remove common task-related words for better matching
    const cleanQuery = queryLower
      .replace(/^(task|the task|a task)\s+/i, "")
      .replace(/\s+(task)$/i, "")
      .trim();

    // Exact match first
    let bestMatch = tasks.find(
      (task) => task.title.toLowerCase() === cleanQuery,
    );

    if (bestMatch) return bestMatch;

    // Partial match with high confidence
    bestMatch = tasks.find((task) =>
      task.title.toLowerCase().includes(cleanQuery),
    );

    if (bestMatch) return bestMatch;

    // Word-based matching with minimum length requirement
    const queryWords = cleanQuery.split(" ").filter((w) => w.length > 2);
    if (queryWords.length > 0) {
      // Find task with most word matches
      let maxMatches = 0;
      let bestWordMatch = null;

      for (const task of tasks) {
        const taskTitle = task.title.toLowerCase();
        const matches = queryWords.filter((word) =>
          taskTitle.includes(word),
        ).length;

        if (
          matches > maxMatches &&
          matches >= Math.ceil(queryWords.length / 2)
        ) {
          maxMatches = matches;
          bestWordMatch = task;
        }
      }

      if (bestWordMatch) return bestWordMatch;
    }

    return null;
  }

  /**
   * Handle confirmation responses with enhanced security
   */
  private static handleConfirmationResponse(input: string): SmartCommandResult {
    const lowerResponse = input.toLowerCase().trim();
    const confirmation = this.pendingConfirmation;

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
      this.pendingConfirmation = null; // Clear only on successful execution

      if (confirmation.action === "delete") {
        try {
          const success = StorageService.deleteTask(confirmation.taskId);
          if (success) {
            return {
              success: true,
              message: `Deleted task: "${confirmation.taskTitle}"`,
              action: "delete",
              confidence: 0.95,
              spokenReply: `Task deleted. "${confirmation.taskTitle}" has been removed from your list.`,
            };
          } else {
            throw new Error("Delete failed");
          }
        } catch (error) {
          return {
            success: false,
            message: "Failed to delete task. Please try again.",
            confidence: 0.5,
            spokenReply:
              "Sorry, I couldn't delete that task. Please try again.",
          };
        }
      } else if (confirmation.action === "complete") {
        try {
          const success = StorageService.updateTaskStatus(
            confirmation.taskId,
            "completed",
          );
          if (success) {
            return {
              success: true,
              message: `Completed task: "${confirmation.taskTitle}"`,
              action: "complete",
              confidence: 0.95,
              spokenReply: `Task completed! I've marked "${confirmation.taskTitle}" as done. Great job!`,
            };
          } else {
            throw new Error("Update failed");
          }
        } catch (error) {
          return {
            success: false,
            message: "Failed to complete task. Please try again.",
            confidence: 0.5,
            spokenReply:
              "Sorry, I couldn't complete that task. Please try again.",
          };
        }
      }
    }

    // Check for negative responses
    if (this.isNegativeResponse(lowerResponse)) {
      this.pendingConfirmation = null;
      return {
        success: true,
        message: "Action cancelled.",
        confidence: 0.9,
        spokenReply: `Okay, I cancelled that action. "${confirmation.taskTitle}" remains unchanged.`,
      };
    }

    // Unclear response - keep confirmation and ask again
    return {
      success: false,
      message: `I didn't understand. Please say "yes" to ${confirmation.action} "${confirmation.taskTitle}" or "no" to cancel.`,
      requiresConfirmation: true,
      confidence: 0.3,
      spokenReply: `I didn't understand. Please say yes to ${confirmation.action} the task, or no to cancel.`,
    };
  }

  /**
   * Generate helpful response for unknown commands
   */
  private static generateHelpResponse(input: string): SmartCommandResult {
    const tasks = StorageService.getTasks();
    const pendingTasks = tasks.filter((t) => t.status !== "completed");

    let helpMessage =
      "Sorry, I didn't understand that. Here's what you can say:";
    let spokenHelp = "Sorry, I didn't understand. You can say:";

    const examples = [
      "Add task to buy groceries",
      "Mark task number 1 as done",
      "Delete task buy groceries",
      "Show my tasks",
    ];

    if (pendingTasks.length > 0) {
      const taskList = pendingTasks
        .slice(0, 2)
        .map((t, i) => `${i + 1}. "${t.title}"`)
        .join(", ");
      helpMessage += ` For example: ${examples.join(", ")}. Your current tasks are: ${taskList}`;
      spokenHelp += ` Add task followed by what you want to do, Mark task number or task name as done, Delete task and the name, or Show my tasks. Your current tasks are: ${taskList}`;
    } else {
      helpMessage += ` For example: ${examples.join(", ")}`;
      spokenHelp += ` Add task followed by what you want to do, Mark task as done, Delete task, or Show my tasks.`;
    }

    return {
      success: false,
      message: helpMessage,
      confidence: 0,
      spokenReply: spokenHelp,
    };
  }

  /**
   * Check if response is affirmative with enhanced patterns
   */
  private static isAffirmativeResponse(response: string): boolean {
    const exact = [
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
      "correct",
      "affirmative",
    ];

    const patterns = [
      /^yes,?\s+(delete|complete|mark)/i,
      /^(delete|complete|mark)\s+it/i,
      /^go\s+ahead/i,
    ];

    // Check exact matches first
    if (exact.includes(response)) return true;

    // Check pattern matches
    return patterns.some((pattern) => pattern.test(response));
  }

  /**
   * Check if response is negative with enhanced patterns
   */
  private static isNegativeResponse(response: string): boolean {
    const exact = [
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
      "negative",
    ];

    const patterns = [
      /^no,?\s+(don't|dont)/i,
      /^(don't|dont)\s+(delete|complete|mark)/i,
      /^cancel\s+(that|it)/i,
    ];

    // Check exact matches first
    if (exact.includes(response)) return true;

    // Check pattern matches
    return patterns.some((pattern) => pattern.test(response));
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
