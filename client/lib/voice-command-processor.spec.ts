import { describe, it, expect, beforeEach, vi } from "vitest";
import { VoiceCommandProcessor } from "./voice-command-processor";
import { StorageService } from "./storage-service";
import { Task } from "@/components/ui/task-card";

// Mock StorageService
vi.mock("./storage-service", () => ({
  StorageService: {
    getTasks: vi.fn(),
    getTasksByStatus: vi.fn(),
    addTask: vi.fn(),
    updateTaskStatus: vi.fn(),
    deleteTask: vi.fn(),
  },
}));

describe("VoiceCommandProcessor", () => {
  const mockTasks: Task[] = [
    {
      id: "1",
      title: "Buy groceries",
      priority: "medium",
      status: "pending",
      tags: ["personal"],
    },
    {
      id: "2",
      title: "Review quarterly report",
      priority: "high",
      status: "pending",
      tags: ["work"],
    },
    {
      id: "3",
      title: "Call dentist",
      priority: "low",
      status: "completed",
      tags: ["health"],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (StorageService.getTasks as any).mockReturnValue(mockTasks);
    (StorageService.getTasksByStatus as any).mockImplementation(
      (status: string) => mockTasks.filter((task) => task.status === status),
    );
  });

  describe("parseCommand", () => {
    it("should parse number-based mark commands", () => {
      const testCases = [
        "mark task number 2",
        "mark task 2",
        "complete task number 1",
        "mark the second task",
        "complete the third task",
      ];

      testCases.forEach((command) => {
        const result = VoiceCommandProcessor.parseCommand(command);
        expect(result.action).toBe("mark");
        expect(result.targetType).toBe("number");
        expect(typeof result.target).toBe("number");
      });
    });

    it("should parse name-based mark commands", () => {
      const testCases = [
        "mark Buy groceries",
        "complete Buy groceries",
        "mark groceries done",
        "finish the grocery task",
      ];

      testCases.forEach((command) => {
        const result = VoiceCommandProcessor.parseCommand(command);
        expect(result.action).toBe("mark");
        expect(result.targetType).toBe("name");
        expect(typeof result.target).toBe("string");
      });
    });

    it("should parse number-based delete commands", () => {
      const testCases = [
        "delete task number 1",
        "remove task 2",
        "delete the first task",
        "remove the third task",
      ];

      testCases.forEach((command) => {
        const result = VoiceCommandProcessor.parseCommand(command);
        expect(result.action).toBe("delete");
        expect(result.targetType).toBe("number");
        expect(typeof result.target).toBe("number");
      });
    });

    it("should parse name-based delete commands", () => {
      const testCases = [
        "delete Buy groceries",
        "remove Call dentist",
        "delete the grocery task",
        "can you remove Buy milk",
      ];

      testCases.forEach((command) => {
        const result = VoiceCommandProcessor.parseCommand(command);
        expect(result.action).toBe("delete");
        expect(result.targetType).toBe("name");
        expect(typeof result.target).toBe("string");
      });
    });

    it("should parse generic commands", () => {
      const testCases = [
        "mark complete",
        "delete task",
        "mark done",
        "remove task",
      ];

      testCases.forEach((command) => {
        const result = VoiceCommandProcessor.parseCommand(command);
        expect(result.targetType).toBe("generic");
      });
    });

    it("should parse natural variations", () => {
      const variations = [
        {
          command: "Mark grocery task as done",
          action: "mark",
          targetType: "name",
        },
        {
          command: "Delete the third task",
          action: "delete",
          targetType: "number",
        },
        {
          command: "Can you remove Buy milk",
          action: "delete",
          targetType: "name",
        },
        {
          command: "Task number 2 mark complete",
          action: "mark",
          targetType: "number",
        },
      ];

      variations.forEach(({ command, action, targetType }) => {
        const result = VoiceCommandProcessor.parseCommand(command);
        expect(result.action).toBe(action);
        expect(result.targetType).toBe(targetType);
      });
    });
  });

  describe("findTaskByNumber", () => {
    it("should find task by 1-based index", () => {
      const task1 = VoiceCommandProcessor.findTaskByNumber(1);
      const task2 = VoiceCommandProcessor.findTaskByNumber(2);
      const task3 = VoiceCommandProcessor.findTaskByNumber(3);

      expect(task1?.id).toBe("1");
      expect(task2?.id).toBe("2");
      expect(task3?.id).toBe("3");
    });

    it("should return null for out-of-bounds indices", () => {
      const taskZero = VoiceCommandProcessor.findTaskByNumber(0);
      const taskFour = VoiceCommandProcessor.findTaskByNumber(4);

      expect(taskZero).toBeNull();
      expect(taskFour).toBeNull();
    });
  });

  describe("findTaskByName", () => {
    it("should find task by exact title match", () => {
      const task = VoiceCommandProcessor.findTaskByName("Buy groceries");
      expect(task?.id).toBe("1");
    });

    it("should find task by partial title match", () => {
      const task = VoiceCommandProcessor.findTaskByName("groceries");
      expect(task?.id).toBe("1");
    });

    it("should find task case-insensitively", () => {
      const task = VoiceCommandProcessor.findTaskByName("BUY GROCERIES");
      expect(task?.id).toBe("1");
    });

    it("should return null for non-existent task", () => {
      const task = VoiceCommandProcessor.findTaskByName("Walk the dog");
      expect(task).toBeNull();
    });

    it("should return null for very short search terms", () => {
      const task = VoiceCommandProcessor.findTaskByName("a");
      expect(task).toBeNull();
    });
  });

  describe("executeCommand", () => {
    it("should mark task by number successfully", async () => {
      (StorageService.updateTaskStatus as any).mockReturnValue(true);

      const parsedCommand = {
        action: "mark" as const,
        targetType: "number" as const,
        target: 1,
        originalCommand: "mark task number 1",
      };

      const result = await VoiceCommandProcessor.executeCommand(parsedCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain("Buy groceries");
      expect(StorageService.updateTaskStatus).toHaveBeenCalledWith(
        "1",
        "completed",
      );
    });

    it("should mark task by name successfully", async () => {
      (StorageService.updateTaskStatus as any).mockReturnValue(true);

      const parsedCommand = {
        action: "mark" as const,
        targetType: "name" as const,
        target: "Buy groceries",
        originalCommand: "mark Buy groceries",
      };

      const result = await VoiceCommandProcessor.executeCommand(parsedCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain("Buy groceries");
      expect(StorageService.updateTaskStatus).toHaveBeenCalledWith(
        "1",
        "completed",
      );
    });

    it("should delete task by number successfully", async () => {
      (StorageService.deleteTask as any).mockReturnValue(true);

      const parsedCommand = {
        action: "delete" as const,
        targetType: "number" as const,
        target: 2,
        originalCommand: "delete task number 2",
      };

      const result = await VoiceCommandProcessor.executeCommand(parsedCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain("Review quarterly report");
      expect(StorageService.deleteTask).toHaveBeenCalledWith("2");
    });

    it("should handle non-existent task numbers", async () => {
      const parsedCommand = {
        action: "mark" as const,
        targetType: "number" as const,
        target: 10,
        originalCommand: "mark task number 10",
      };

      const result = await VoiceCommandProcessor.executeCommand(parsedCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain("couldn't find task number 10");
    });

    it("should handle non-existent task names", async () => {
      const parsedCommand = {
        action: "mark" as const,
        targetType: "name" as const,
        target: "Walk the dog",
        originalCommand: "mark Walk the dog",
      };

      const result = await VoiceCommandProcessor.executeCommand(parsedCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain("couldn't find a task named");
    });

    it("should handle already completed tasks", async () => {
      const parsedCommand = {
        action: "mark" as const,
        targetType: "number" as const,
        target: 3, // Call dentist is already completed
        originalCommand: "mark task number 3",
      };

      const result = await VoiceCommandProcessor.executeCommand(parsedCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain("already completed");
    });
  });

  describe("processVoiceCommand", () => {
    it("should process complete voice commands end-to-end", async () => {
      (StorageService.updateTaskStatus as any).mockReturnValue(true);

      const result =
        await VoiceCommandProcessor.processVoiceCommand("mark task number 1");

      expect(result.success).toBe(true);
      expect(result.message).toContain("Buy groceries");
    });

    it("should handle empty commands", async () => {
      const result = await VoiceCommandProcessor.processVoiceCommand("");

      expect(result.success).toBe(false);
      expect(result.message).toContain("didn't hear anything");
    });

    it("should handle unknown commands", async () => {
      const result =
        await VoiceCommandProcessor.processVoiceCommand("play music");

      expect(result.success).toBe(false);
      expect(result.message).toContain("couldn't understand");
    });
  });
});
