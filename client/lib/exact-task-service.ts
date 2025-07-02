import { StorageService } from "./storage-service";
import { Task, TaskStatus } from "@/components/ui/task-card";

export interface ExactTaskCommand {
  type: "add" | "delete" | "complete" | "unknown";
  exactText: string;
  originalCommand: string;
  success: boolean;
  message: string;
  requiresConfirmation?: boolean;
  taskAffected?: Task;
}

/**
 * Exact Task Service - No auto-correction, no assumptions, no expansions
 * Performs task operations exactly as commanded without any intelligent interpretation
 */
export class ExactTaskService {
  /**
   * Process a command with exact text matching - no assumptions or auto-corrections
   */
  static processExactCommand(command: string): ExactTaskCommand {
    const cleanCommand = command.trim();

    if (!cleanCommand) {
      return {
        type: "unknown",
        exactText: "",
        originalCommand: command,
        success: false,
        message: "Please provide a command.",
      };
    }

    // Detect command type based on exact patterns
    const addMatch = this.extractAddCommand(cleanCommand);
    if (addMatch) {
      return this.executeAddTask(addMatch, cleanCommand);
    }

    const deleteMatch = this.extractDeleteCommand(cleanCommand);
    if (deleteMatch) {
      return this.executeDeleteTask(deleteMatch, cleanCommand);
    }

    const completeMatch = this.extractCompleteCommand(cleanCommand);
    if (completeMatch) {
      return this.executeCompleteTask(completeMatch, cleanCommand);
    }

    return {
      type: "unknown",
      exactText: cleanCommand,
      originalCommand: command,
      success: false,
      message:
        "Command not recognized. Try 'Add task [text]', 'Delete task [text]', or 'Complete task [text]'.",
    };
  }

  /**
   * Extract add task command - exact text only
   */
  private static extractAddCommand(command: string): string | null {
    const patterns = [
      /^add\s+(?:a\s+)?task\s+(.+)$/i,
      /^add\s+(?:the\s+)?task\s+(.+)$/i,
      /^create\s+(?:a\s+)?task\s+(.+)$/i,
      /^add\s+(.+)$/i,
    ];

    for (const pattern of patterns) {
      const match = command.match(pattern);
      if (match && match[1].trim()) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Extract delete task command - exact text only
   */
  private static extractDeleteCommand(command: string): string | null {
    const patterns = [
      /^delete\s+(?:the\s+)?task\s+(.+)$/i,
      /^remove\s+(?:the\s+)?task\s+(.+)$/i,
      /^delete\s+(.+)$/i,
      /^remove\s+(.+)$/i,
    ];

    for (const pattern of patterns) {
      const match = command.match(pattern);
      if (match && match[1].trim()) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Extract complete task command - exact text only
   */
  private static extractCompleteCommand(command: string): string | null {
    const patterns = [
      /^(?:complete|mark|finish)\s+(?:the\s+)?task\s+(.+)$/i,
      /^mark\s+(.+)\s+(?:as\s+)?(?:complete|done|finished)$/i,
      /^complete\s+(.+)$/i,
      /^finish\s+(.+)$/i,
    ];

    for (const pattern of patterns) {
      const match = command.match(pattern);
      if (match && match[1].trim()) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Execute add task with exact text - no modifications
   */
  private static executeAddTask(
    taskText: string,
    originalCommand: string,
  ): ExactTaskCommand {
    try {
      const newTask: Omit<Task, "id"> = {
        title: taskText, // Exact text, no modifications
        priority: "medium",
        status: "pending",
        tags: ["exact-command"],
      };

      const addedTask = StorageService.addTask(newTask);

      return {
        type: "add",
        exactText: taskText,
        originalCommand,
        success: true,
        message: `Added task: "${taskText}"`,
        taskAffected: addedTask,
      };
    } catch (error) {
      return {
        type: "add",
        exactText: taskText,
        originalCommand,
        success: false,
        message: "Failed to add task. Please try again.",
      };
    }
  }

  /**
   * Execute delete task with exact text matching only
   */
  private static executeDeleteTask(
    taskText: string,
    originalCommand: string,
  ): ExactTaskCommand {
    const tasks = StorageService.getTasks();

    // Find exact match first
    let matchingTask = tasks.find(
      (task) => task.title.toLowerCase() === taskText.toLowerCase(),
    );

    if (!matchingTask) {
      return {
        type: "delete",
        exactText: taskText,
        originalCommand,
        success: false,
        message: `No task found with exact text: "${taskText}". Task names must match exactly.`,
      };
    }

    return {
      type: "delete",
      exactText: taskText,
      originalCommand,
      success: false, // Requires confirmation
      message: `Are you sure you want to delete: "${matchingTask.title}"?`,
      requiresConfirmation: true,
      taskAffected: matchingTask,
    };
  }

  /**
   * Execute complete task with exact text matching only
   */
  private static executeCompleteTask(
    taskText: string,
    originalCommand: string,
  ): ExactTaskCommand {
    const tasks = StorageService.getTasks();

    // Find exact match first
    let matchingTask = tasks.find(
      (task) => task.title.toLowerCase() === taskText.toLowerCase(),
    );

    if (!matchingTask) {
      return {
        type: "complete",
        exactText: taskText,
        originalCommand,
        success: false,
        message: `No task found with exact text: "${taskText}". Task names must match exactly.`,
      };
    }

    if (matchingTask.status === "completed") {
      return {
        type: "complete",
        exactText: taskText,
        originalCommand,
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
          type: "complete",
          exactText: taskText,
          originalCommand,
          success: true,
          message: `Completed task: "${matchingTask.title}"`,
          taskAffected: matchingTask,
        };
      } else {
        throw new Error("Update failed");
      }
    } catch (error) {
      return {
        type: "complete",
        exactText: taskText,
        originalCommand,
        success: false,
        message: "Failed to complete task. Please try again.",
        taskAffected: matchingTask,
      };
    }
  }

  /**
   * Confirm and execute a pending delete operation
   */
  static confirmDeleteTask(taskId: string): ExactTaskCommand {
    try {
      const task = StorageService.getTaskById(taskId);

      if (!task) {
        return {
          type: "delete",
          exactText: "",
          originalCommand: "",
          success: false,
          message: "Task not found.",
        };
      }

      const success = StorageService.deleteTask(taskId);

      if (success) {
        return {
          type: "delete",
          exactText: task.title,
          originalCommand: "",
          success: true,
          message: `Deleted task: "${task.title}"`,
          taskAffected: task,
        };
      } else {
        throw new Error("Delete failed");
      }
    } catch (error) {
      return {
        type: "delete",
        exactText: "",
        originalCommand: "",
        success: false,
        message: "Failed to delete task. Please try again.",
      };
    }
  }

  /**
   * List all tasks with their exact titles
   */
  static listAllTasks(): string[] {
    return StorageService.getTasks().map((task) => task.title);
  }

  /**
   * Get task count for status messages
   */
  static getTaskCount(): { total: number; pending: number; completed: number } {
    const tasks = StorageService.getTasks();
    return {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === "pending").length,
      completed: tasks.filter((t) => t.status === "completed").length,
    };
  }
}
