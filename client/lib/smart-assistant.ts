import { StorageService } from "./storage-service";
import { Task, TaskStatus, TaskPriority } from "@/components/ui/task-card";

export interface SmartAssistantResponse {
  success: boolean;
  message: string;
  action?:
    | "add"
    | "complete"
    | "delete"
    | "modify"
    | "confirm"
    | "disambiguate";
  requiresConfirmation?: boolean;
  requiresDisambiguation?: boolean;
  candidateTasks?: Task[];
  pendingAction?: PendingAction;
  taskAffected?: Task;
  conversational: boolean;
}

export interface PendingAction {
  type: "delete" | "modify";
  taskId: string;
  originalCommand: string;
  newContent?: string;
}

export interface TaskSuggestion {
  task: Task;
  similarity: number;
  matchType: "exact" | "partial" | "fuzzy";
}

export class SmartTaskAssistant {
  private static pendingConfirmation: PendingAction | null = null;
  private static pendingDisambiguation: {
    action: PendingAction;
    candidates: TaskSuggestion[];
  } | null = null;

  /**
   * Main entry point for processing natural language commands
   */
  static async processCommand(input: string): Promise<SmartAssistantResponse> {
    const cleanInput = input.trim().toLowerCase();

    // Handle confirmation responses
    if (this.pendingConfirmation) {
      return await this.handleConfirmationResponse(cleanInput);
    }

    // Handle disambiguation responses
    if (this.pendingDisambiguation) {
      return await this.handleDisambiguationResponse(cleanInput);
    }

    // Parse and execute new command
    return await this.parseAndExecuteCommand(input);
  }

  /**
   * Parse natural language and determine intent
   */
  private static async parseAndExecuteCommand(
    input: string,
  ): Promise<SmartAssistantResponse> {
    const intent = this.detectIntent(input);

    switch (intent.type) {
      case "add":
        return await this.handleAddTask(intent.content, intent.metadata);
      case "complete":
        return await this.handleCompleteTask(intent.taskName);
      case "delete":
        return await this.handleDeleteTask(intent.taskName);
      case "modify":
        return await this.handleModifyTask(intent.taskName, intent.newContent);
      default:
        return {
          success: false,
          message:
            "I didn't quite understand that. Try saying something like 'Add task: Buy groceries' or 'Mark Buy groceries as done'.",
          conversational: true,
        };
    }
  }

  /**
   * Detect user intent from natural language input
   */
  private static detectIntent(input: string) {
    const lower = input.toLowerCase();

    // Add task patterns
    const addPatterns = [
      /(?:add|create|new)\s+(?:a\s+)?task:?\s*(.+)/i,
      /(?:remind\s+me\s+to|i\s+need\s+to)\s+(.+)/i,
      /(?:hey\s+\w+,?\s*)?(?:add|create)\s+(.+)/i,
      /task:?\s*(.+)/i,
    ];

    // Complete task patterns
    const completePatterns = [
      /(?:mark|complete|finish|done)\s+(?:the\s+)?(?:task\s+)?['""]([^'"]+)['""](?:\s+as\s+(?:done|complete|finished))?/i,
      /(?:task\s+)?['""]([^'"]+)['""](?:\s+is\s+)?(?:complete|done|finished)/i,
      /(?:mark|complete|finish)\s+(.+?)(?:\s+as\s+(?:done|complete|finished))?$/i,
    ];

    // Delete task patterns
    const deletePatterns = [
      /(?:delete|remove|cancel)\s+(?:the\s+)?(?:task\s+)?['""]([^'"]+)['""](?:\s+from\s+(?:the\s+)?list)?/i,
      /(?:remove|delete)\s+(.+?)(?:\s+from\s+(?:the\s+)?list)?$/i,
    ];

    // Modify task patterns
    const modifyPatterns = [
      /(?:change|update|edit|modify)\s+(?:the\s+)?(?:task\s+)?['""]([^'"]+)['""](?:\s+to\s+)?(.+)/i,
      /(?:update|edit)\s+['""]([^'"]+)['""](?:\s+and\s+add\s+)?(.+)/i,
    ];

    // Check add patterns
    for (const pattern of addPatterns) {
      const match = input.match(pattern);
      if (match) {
        const content = match[1].trim();
        return {
          type: "add" as const,
          content,
          metadata: this.extractTaskMetadata(content),
        };
      }
    }

    // Check complete patterns
    for (const pattern of completePatterns) {
      const match = input.match(pattern);
      if (match) {
        return {
          type: "complete" as const,
          taskName: match[1].trim(),
        };
      }
    }

    // Check delete patterns
    for (const pattern of deletePatterns) {
      const match = input.match(pattern);
      if (match) {
        return {
          type: "delete" as const,
          taskName: match[1].trim(),
        };
      }
    }

    // Check modify patterns
    for (const pattern of modifyPatterns) {
      const match = input.match(pattern);
      if (match) {
        return {
          type: "modify" as const,
          taskName: match[1].trim(),
          newContent: match[2].trim(),
        };
      }
    }

    return { type: "unknown" as const };
  }

  /**
   * Extract metadata from task content (priority, due date, etc.)
   */
  private static extractTaskMetadata(content: string) {
    const metadata: {
      priority?: TaskPriority;
      dueDate?: Date;
      tags?: string[];
    } = {};

    // Extract priority
    if (/\b(urgent|asap|immediately|critical)\b/i.test(content)) {
      metadata.priority = "urgent";
    } else if (/\b(important|high|priority)\b/i.test(content)) {
      metadata.priority = "high";
    } else if (/\b(low|later|someday)\b/i.test(content)) {
      metadata.priority = "low";
    } else {
      metadata.priority = "medium";
    }

    // Extract due dates
    const datePatterns = [
      /\b(?:by|before|until)\s+(\d{1,2}(?:\s*(?:am|pm))?)\b/i,
      /\b(today|tomorrow|tonight)\b/i,
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
      /\b(\d{1,2}\/\d{1,2}|\d{1,2}-\d{1,2})\b/i,
    ];

    for (const pattern of datePatterns) {
      const match = content.match(pattern);
      if (match) {
        try {
          metadata.dueDate = this.parseDate(match[1]);
          break;
        } catch (e) {
          // Continue trying other patterns
        }
      }
    }

    // Extract common tags
    const tags: string[] = [];
    if (/\b(call|phone|contact)\b/i.test(content)) tags.push("call");
    if (/\b(buy|purchase|shopping)\b/i.test(content)) tags.push("shopping");
    if (/\b(meeting|meet)\b/i.test(content)) tags.push("meeting");
    if (/\b(email|send|reply)\b/i.test(content)) tags.push("email");
    if (/\b(report|document|write)\b/i.test(content)) tags.push("document");

    if (tags.length > 0) {
      metadata.tags = tags;
    }

    return metadata;
  }

  /**
   * Parse natural language dates
   */
  private static parseDate(dateStr: string): Date {
    const lower = dateStr.toLowerCase();
    const now = new Date();

    switch (lower) {
      case "today":
        return now;
      case "tomorrow":
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        return tomorrow;
      case "tonight":
        const tonight = new Date(now);
        tonight.setHours(20, 0, 0, 0);
        return tonight;
      default:
        // Try to parse as date
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
        throw new Error("Could not parse date");
    }
  }

  /**
   * Handle adding new tasks
   */
  private static async handleAddTask(
    content: string,
    metadata: any,
  ): Promise<SmartAssistantResponse> {
    try {
      const newTask: Omit<Task, "id"> = {
        title: content,
        priority: metadata.priority || "medium",
        status: "pending",
        dueDate: metadata.dueDate,
        tags: ["voice", ...(metadata.tags || [])],
      };

      const addedTask = StorageService.addTask(newTask);

      return {
        success: true,
        message: `Got it! I added "${content}" to your tasks.`,
        action: "add",
        taskAffected: addedTask,
        conversational: true,
      };
    } catch (error) {
      return {
        success: false,
        message: "Sorry, I couldn't add that task. Please try again.",
        conversational: true,
      };
    }
  }

  /**
   * Handle completing tasks
   */
  private static async handleCompleteTask(
    taskName: string,
  ): Promise<SmartAssistantResponse> {
    const suggestions = this.findTaskSuggestions(taskName);

    if (suggestions.length === 0) {
      return {
        success: false,
        message: `I couldn't find a task named "${taskName}". Could you check the name and try again?`,
        conversational: true,
      };
    }

    if (suggestions.length === 1) {
      const task = suggestions[0].task;

      if (task.status === "completed") {
        return {
          success: false,
          message: `"${task.title}" is already completed!`,
          conversational: true,
        };
      }

      const success = StorageService.updateTaskStatus(task.id, "completed");
      if (success) {
        return {
          success: true,
          message: `Excellent! I marked "${task.title}" as complete. Well done! 🎉`,
          action: "complete",
          taskAffected: task,
          conversational: true,
        };
      }
    }

    // Multiple matches - need disambiguation
    return {
      success: false,
      message: `I found ${suggestions.length} tasks that match "${taskName}". Which one did you mean?`,
      requiresDisambiguation: true,
      candidateTasks: suggestions.map((s) => s.task),
      conversational: true,
    };
  }

  /**
   * Handle deleting tasks (with confirmation)
   */
  private static async handleDeleteTask(
    taskName: string,
  ): Promise<SmartAssistantResponse> {
    const suggestions = this.findTaskSuggestions(taskName);

    if (suggestions.length === 0) {
      return {
        success: false,
        message: `I couldn't find a task named "${taskName}". Could you check the name and try again?`,
        conversational: true,
      };
    }

    if (suggestions.length === 1) {
      const task = suggestions[0].task;

      // Set up confirmation
      this.pendingConfirmation = {
        type: "delete",
        taskId: task.id,
        originalCommand: taskName,
      };

      return {
        success: false,
        message: `Are you sure you want to delete "${task.title}"? Say 'yes' to confirm or 'no' to cancel.`,
        requiresConfirmation: true,
        taskAffected: task,
        conversational: true,
      };
    }

    // Multiple matches - need disambiguation first
    this.pendingDisambiguation = {
      action: { type: "delete", taskId: "", originalCommand: taskName },
      candidates: suggestions,
    };

    return {
      success: false,
      message: `I found ${suggestions.length} tasks that match "${taskName}". Which one do you want to delete?`,
      requiresDisambiguation: true,
      candidateTasks: suggestions.map((s) => s.task),
      conversational: true,
    };
  }

  /**
   * Handle modifying tasks
   */
  private static async handleModifyTask(
    taskName: string,
    newContent: string,
  ): Promise<SmartAssistantResponse> {
    const suggestions = this.findTaskSuggestions(taskName);

    if (suggestions.length === 0) {
      return {
        success: false,
        message: `I couldn't find a task named "${taskName}". Could you check the name and try again?`,
        conversational: true,
      };
    }

    if (suggestions.length === 1) {
      const task = suggestions[0].task;

      // Set up confirmation for modification
      this.pendingConfirmation = {
        type: "modify",
        taskId: task.id,
        originalCommand: taskName,
        newContent,
      };

      return {
        success: false,
        message: `I'll change "${task.title}" to "${newContent}". Say 'yes' to confirm or 'no' to cancel.`,
        requiresConfirmation: true,
        taskAffected: task,
        conversational: true,
      };
    }

    // Multiple matches - need disambiguation
    this.pendingDisambiguation = {
      action: {
        type: "modify",
        taskId: "",
        originalCommand: taskName,
        newContent,
      },
      candidates: suggestions,
    };

    return {
      success: false,
      message: `I found ${suggestions.length} tasks that match "${taskName}". Which one do you want to modify?`,
      requiresDisambiguation: true,
      candidateTasks: suggestions.map((s) => s.task),
      conversational: true,
    };
  }

  /**
   * Handle confirmation responses (yes/no)
   */
  private static async handleConfirmationResponse(
    input: string,
  ): Promise<SmartAssistantResponse> {
    const confirmation = this.pendingConfirmation;
    this.pendingConfirmation = null;

    if (!confirmation) {
      return {
        success: false,
        message:
          "I'm not sure what you're confirming. Could you try your command again?",
        conversational: true,
      };
    }

    const isYes = /^(yes|y|yeah|yep|sure|ok|okay|confirm|do it)$/i.test(input);
    const isNo = /^(no|n|nope|cancel|stop|nevermind|never mind)$/i.test(input);

    if (isYes) {
      if (confirmation.type === "delete") {
        const success = StorageService.deleteTask(confirmation.taskId);
        if (success) {
          return {
            success: true,
            message: "Task deleted successfully. It's gone for good!",
            action: "delete",
            conversational: true,
          };
        }
      } else if (confirmation.type === "modify" && confirmation.newContent) {
        const success = StorageService.updateTask(confirmation.taskId, {
          title: confirmation.newContent,
        });
        if (success) {
          return {
            success: true,
            message: `Perfect! I've updated the task to "${confirmation.newContent}".`,
            action: "modify",
            conversational: true,
          };
        }
      }
    } else if (isNo) {
      return {
        success: true,
        message: "No problem! I've cancelled that action.",
        conversational: true,
      };
    }

    return {
      success: false,
      message:
        "I didn't understand your response. Please say 'yes' to confirm or 'no' to cancel.",
      requiresConfirmation: true,
      conversational: true,
    };
  }

  /**
   * Handle disambiguation responses
   */
  private static async handleDisambiguationResponse(
    input: string,
  ): Promise<SmartAssistantResponse> {
    const disambiguation = this.pendingDisambiguation;
    this.pendingDisambiguation = null;

    if (!disambiguation) {
      return {
        success: false,
        message:
          "I'm not sure which task you're referring to. Could you try your command again?",
        conversational: true,
      };
    }

    // Try to match the response to one of the candidates
    const numberMatch = input.match(/(\d+)/);
    if (numberMatch) {
      const index = parseInt(numberMatch[1]) - 1;
      if (index >= 0 && index < disambiguation.candidates.length) {
        const selectedTask = disambiguation.candidates[index].task;
        disambiguation.action.taskId = selectedTask.id;

        // Execute the action with the selected task
        if (disambiguation.action.type === "delete") {
          this.pendingConfirmation = disambiguation.action;
          return {
            success: false,
            message: `Are you sure you want to delete "${selectedTask.title}"? Say 'yes' to confirm or 'no' to cancel.`,
            requiresConfirmation: true,
            taskAffected: selectedTask,
            conversational: true,
          };
        } else if (disambiguation.action.type === "modify") {
          this.pendingConfirmation = disambiguation.action;
          return {
            success: false,
            message: `I'll change "${selectedTask.title}" to "${disambiguation.action.newContent}". Say 'yes' to confirm or 'no' to cancel.`,
            requiresConfirmation: true,
            taskAffected: selectedTask,
            conversational: true,
          };
        }
      }
    }

    // Try to match by task name
    const suggestions = this.findTaskSuggestions(
      input,
      disambiguation.candidates.map((c) => c.task),
    );
    if (suggestions.length === 1) {
      const selectedTask = suggestions[0].task;
      disambiguation.action.taskId = selectedTask.id;

      // Execute the action with the selected task
      if (disambiguation.action.type === "delete") {
        this.pendingConfirmation = disambiguation.action;
        return {
          success: false,
          message: `Are you sure you want to delete "${selectedTask.title}"? Say 'yes' to confirm or 'no' to cancel.`,
          requiresConfirmation: true,
          taskAffected: selectedTask,
          conversational: true,
        };
      }
    }

    return {
      success: false,
      message:
        "I didn't understand which task you meant. Please try saying the task number (like '1' or '2') or the exact task name.",
      conversational: true,
    };
  }

  /**
   * Find task suggestions based on similarity
   */
  private static findTaskSuggestions(
    query: string,
    candidates?: Task[],
  ): TaskSuggestion[] {
    const tasks = candidates || StorageService.getTasks();
    const suggestions: TaskSuggestion[] = [];

    for (const task of tasks) {
      const similarity = this.calculateSimilarity(
        query.toLowerCase(),
        task.title.toLowerCase(),
      );

      if (similarity > 0.3) {
        // Threshold for relevance
        const matchType = this.getMatchType(
          query.toLowerCase(),
          task.title.toLowerCase(),
        );
        suggestions.push({ task, similarity, matchType });
      }
    }

    // Sort by similarity (highest first)
    return suggestions.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Calculate similarity between two strings
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    // Exact match
    if (str1 === str2) return 1.0;

    // Contains match
    if (str2.includes(str1) || str1.includes(str2)) return 0.8;

    // Word overlap
    const words1 = str1.split(" ");
    const words2 = str2.split(" ");
    const intersection = words1.filter((word) => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];

    if (intersection.length > 0) {
      return (intersection.length / union.length) * 0.6;
    }

    // Character overlap (simplified)
    let overlap = 0;
    for (const char of str1) {
      if (str2.includes(char)) overlap++;
    }

    return (overlap / Math.max(str1.length, str2.length)) * 0.4;
  }

  /**
   * Determine match type
   */
  private static getMatchType(
    query: string,
    title: string,
  ): "exact" | "partial" | "fuzzy" {
    if (query === title) return "exact";
    if (title.includes(query) || query.includes(title)) return "partial";
    return "fuzzy";
  }

  /**
   * Clear any pending state
   */
  static clearPendingState() {
    this.pendingConfirmation = null;
    this.pendingDisambiguation = null;
  }

  /**
   * Check if there's a pending action
   */
  static hasPendingAction(): boolean {
    return (
      this.pendingConfirmation !== null || this.pendingDisambiguation !== null
    );
  }
}
