import { StorageService } from "./storage-service";
import { Task, TaskStatus } from "@/components/ui/task-card";

export interface VoiceCommandResult {
  success: boolean;
  message: string;
  action?: string;
  taskAffected?: Task;
}

export interface ParsedCommand {
  action: "mark" | "delete" | "add" | "unknown";
  targetType: "number" | "name" | "generic" | "none";
  target?: string | number;
  taskDetails?: Partial<Task>;
  originalCommand: string;
}

export class VoiceCommandProcessor {
  /**
   * Parse voice command and extract action, target type, and target
   */
  static parseCommand(command: string): ParsedCommand {
    const normalized = command.toLowerCase().trim();

    // Remove common filler words and normalize
    const cleanCommand = normalized
      .replace(/\b(can you|could you|please|the|a|an)\b/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // Detect action type
    let action: ParsedCommand["action"] = "unknown";
    let remainingText = cleanCommand;

    // Mark/Complete patterns
    if (/\b(mark|complete|finish|done)\b/.test(cleanCommand)) {
      action = "mark";
      remainingText = cleanCommand
        .replace(/\b(mark|complete|finish|done|as|task|tasks)\b/g, "")
        .trim();
    }
    // Delete/Remove patterns
    else if (/\b(delete|remove|cancel)\b/.test(cleanCommand)) {
      action = "delete";
      remainingText = cleanCommand
        .replace(/\b(delete|remove|cancel|task|tasks)\b/g, "")
        .trim();
    }
    // Add task patterns
    else if (/\b(add|create|new)\b/.test(cleanCommand)) {
      action = "add";
      remainingText = cleanCommand
        .replace(/\b(add|create|new|task|tasks)\b/g, "")
        .trim();
    }

    // Determine target type and extract target
    let targetType: ParsedCommand["targetType"] = "none";
    let target: string | number | undefined;

    if (action === "mark" || action === "delete") {
      // Check for number-based targeting
      const numberMatch =
        remainingText.match(/\b(number\s+)?(\d+)(st|nd|rd|th)?\b/) ||
        remainingText.match(
          /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\b/,
        ) ||
        remainingText.match(/\b(\d+)\b/);

      if (numberMatch) {
        targetType = "number";

        // Convert word numbers to digits
        const wordToNumber: { [key: string]: number } = {
          first: 1,
          second: 2,
          third: 3,
          fourth: 4,
          fifth: 5,
          sixth: 6,
          seventh: 7,
          eighth: 8,
          ninth: 9,
          tenth: 10,
        };

        const wordNumber = numberMatch[0].toLowerCase();
        target =
          wordToNumber[wordNumber] ||
          parseInt(numberMatch[2] || numberMatch[1] || numberMatch[0]);
      }
      // Check for name-based targeting
      else if (remainingText.length > 0) {
        targetType = "name";
        // Clean up the remaining text to get task name
        target = remainingText
          .replace(/\b(task|number|this|that)\b/g, "")
          .trim();
      }
      // Generic targeting (no specific task mentioned)
      else {
        targetType = "generic";
      }
    }

    return {
      action,
      targetType,
      target,
      originalCommand: command,
    };
  }

  /**
   * Find task by number (1-based index)
   */
  static findTaskByNumber(taskNumber: number): Task | null {
    const tasks = StorageService.getTasks();
    // Convert to 0-based index
    const index = taskNumber - 1;

    if (index >= 0 && index < tasks.length) {
      return tasks[index];
    }

    return null;
  }

  /**
   * Get task number (1-based index) for a given task
   */
  static getTaskNumber(taskId: string): number | null {
    const tasks = StorageService.getTasks();
    const index = tasks.findIndex((task) => task.id === taskId);
    return index >= 0 ? index + 1 : null;
  }

  /**
   * Find task by name (case-insensitive partial match)
   */
  static findTaskByName(taskName: string): Task | null {
    if (!taskName || taskName.length < 2) return null;

    const tasks = StorageService.getTasks();
    const searchTerm = taskName.toLowerCase();

    // First try exact match
    let foundTask = tasks.find(
      (task) => task.title.toLowerCase() === searchTerm,
    );

    // If no exact match, try partial match
    if (!foundTask) {
      foundTask = tasks.find((task) =>
        task.title.toLowerCase().includes(searchTerm),
      );
    }

    // If still no match, try word-by-word matching
    if (!foundTask) {
      const searchWords = searchTerm
        .split(" ")
        .filter((word) => word.length > 2);
      if (searchWords.length > 0) {
        foundTask = tasks.find((task) => {
          const taskTitle = task.title.toLowerCase();
          return searchWords.some((word) => taskTitle.includes(word));
        });
      }
    }

    return foundTask || null;
  }

  /**
   * Execute the parsed voice command
   */
  static async executeCommand(
    parsedCommand: ParsedCommand,
  ): Promise<VoiceCommandResult> {
    const { action, targetType, target } = parsedCommand;

    try {
      switch (action) {
        case "mark":
          return await this.executeMarkCommand(targetType, target);

        case "delete":
          return await this.executeDeleteCommand(targetType, target);

        case "add":
          return await this.executeAddCommand(target as string);

        default:
          return {
            success: false,
            message:
              "I couldn't understand that command. Try saying 'mark task number 1' or 'delete Buy groceries'.",
          };
      }
    } catch (error) {
      console.error("Error executing voice command:", error);
      return {
        success: false,
        message: "Sorry, something went wrong while processing your command.",
      };
    }
  }

  /**
   * Execute mark/complete command
   */
  private static async executeMarkCommand(
    targetType: ParsedCommand["targetType"],
    target?: string | number,
  ): Promise<VoiceCommandResult> {
    let taskToMark: Task | null = null;

    switch (targetType) {
      case "number":
        taskToMark = this.findTaskByNumber(target as number);
        if (!taskToMark) {
          return {
            success: false,
            message: `I couldn't find task number ${target}. You have ${StorageService.getTasks().length} tasks.`,
          };
        }
        break;

      case "name":
        taskToMark = this.findTaskByName(target as string);
        if (!taskToMark) {
          return {
            success: false,
            message: `I couldn't find a task named "${target}". Please check the task name and try again.`,
          };
        }
        break;

      case "generic":
        // Mark the first pending task
        const pendingTasks = StorageService.getTasksByStatus("pending");
        if (pendingTasks.length === 0) {
          return {
            success: false,
            message: "You don't have any pending tasks to mark as complete.",
          };
        }
        taskToMark = pendingTasks[0];
        break;

      default:
        return {
          success: false,
          message:
            "Please specify which task to mark. Say 'mark task number 1' or 'mark Buy groceries'.",
        };
    }

    if (taskToMark) {
      // Check if already completed
      if (taskToMark.status === "completed") {
        return {
          success: false,
          message: `The task "${taskToMark.title}" is already completed.`,
        };
      }

      // Mark as completed
      const success = StorageService.updateTaskStatus(
        taskToMark.id,
        "completed",
      );
      if (success) {
        const taskNumber = this.getTaskNumber(taskToMark.id);
        const numberText = taskNumber ? ` (task #${taskNumber})` : "";
        return {
          success: true,
          message: `Great! I marked "${taskToMark.title}"${numberText} as complete.`,
          action: "mark",
          taskAffected: taskToMark,
        };
      }
    }

    return {
      success: false,
      message: "I couldn't mark that task as complete. Please try again.",
    };
  }

  /**
   * Execute delete command
   */
  private static async executeDeleteCommand(
    targetType: ParsedCommand["targetType"],
    target?: string | number,
  ): Promise<VoiceCommandResult> {
    let taskToDelete: Task | null = null;

    switch (targetType) {
      case "number":
        taskToDelete = this.findTaskByNumber(target as number);
        if (!taskToDelete) {
          return {
            success: false,
            message: `I couldn't find task number ${target}. You have ${StorageService.getTasks().length} tasks.`,
          };
        }
        break;

      case "name":
        taskToDelete = this.findTaskByName(target as string);
        if (!taskToDelete) {
          return {
            success: false,
            message: `I couldn't find a task named "${target}". Please check the task name and try again.`,
          };
        }
        break;

      case "generic":
        // Delete the most recent task
        const allTasks = StorageService.getTasks();
        if (allTasks.length === 0) {
          return {
            success: false,
            message: "You don't have any tasks to delete.",
          };
        }
        taskToDelete = allTasks[0];
        break;

      default:
        return {
          success: false,
          message:
            "Please specify which task to delete. Say 'delete task number 1' or 'delete Buy groceries'.",
        };
    }

    if (taskToDelete) {
      const taskNumber = this.getTaskNumber(taskToDelete.id);
      const success = StorageService.deleteTask(taskToDelete.id);
      if (success) {
        const numberText = taskNumber ? ` (task #${taskNumber})` : "";
        return {
          success: true,
          message: `I deleted "${taskToDelete.title}"${numberText}.`,
          action: "delete",
          taskAffected: taskToDelete,
        };
      }
    }

    return {
      success: false,
      message: "I couldn't delete that task. Please try again.",
    };
  }

  /**
   * Execute add command
   */
  private static async executeAddCommand(
    taskTitle?: string,
  ): Promise<VoiceCommandResult> {
    if (!taskTitle || taskTitle.trim().length === 0) {
      return {
        success: false,
        message:
          "Please tell me what task to add. For example, say 'Add task review the report'.",
      };
    }

    const newTask: Omit<Task, "id"> = {
      title: taskTitle.trim(),
      priority: "medium",
      status: "pending",
      tags: ["voice"],
    };

    try {
      const addedTask = StorageService.addTask(newTask);
      return {
        success: true,
        message: `I added the task "${taskTitle}" to your list.`,
        action: "add",
        taskAffected: addedTask,
      };
    } catch (error) {
      return {
        success: false,
        message: "I couldn't add that task. Please try again.",
      };
    }
  }

  /**
   * Process natural language voice command
   */
  static async processVoiceCommand(
    command: string,
  ): Promise<VoiceCommandResult> {
    if (!command || command.trim().length === 0) {
      return {
        success: false,
        message: "I didn't hear anything. Please try again.",
      };
    }

    // Parse the command
    const parsedCommand = this.parseCommand(command);

    // Execute the command
    const result = await this.executeCommand(parsedCommand);

    return result;
  }
}
