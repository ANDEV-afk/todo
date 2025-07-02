import { Task, TaskStatus } from "@/components/ui/task-card";

const STORAGE_KEY = "voice_assistant_tasks";

export class StorageService {
  static getTasks(): Task[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      const tasks = JSON.parse(stored);

      // Convert date strings back to Date objects
      return tasks.map((task: any) => ({
        ...task,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      }));
    } catch (error) {
      console.error("Error loading tasks from storage:", error);
      return [];
    }
  }

  static saveTasks(tasks: Task[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error("Error saving tasks to storage:", error);
    }
  }

  static addTask(task: Omit<Task, "id">): Task {
    const tasks = this.getTasks();
    const newTask: Task = {
      ...task,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };

    tasks.unshift(newTask); // Add to beginning
    this.saveTasks(tasks);
    return newTask;
  }

  static updateTask(taskId: string, updates: Partial<Task>): boolean {
    const tasks = this.getTasks();
    const index = tasks.findIndex((task) => task.id === taskId);

    if (index === -1) return false;

    tasks[index] = { ...tasks[index], ...updates };
    this.saveTasks(tasks);
    return true;
  }

  static deleteTask(taskId: string): boolean {
    const tasks = this.getTasks();
    const filteredTasks = tasks.filter((task) => task.id !== taskId);

    if (filteredTasks.length === tasks.length) return false;

    this.saveTasks(filteredTasks);
    return true;
  }

  static updateTaskStatus(taskId: string, status: TaskStatus): boolean {
    return this.updateTask(taskId, { status });
  }

  static getTaskById(taskId: string): Task | null {
    const tasks = this.getTasks();
    return tasks.find((task) => task.id === taskId) || null;
  }

  static getTasksByStatus(status: TaskStatus): Task[] {
    return this.getTasks().filter((task) => task.status === status);
  }

  static getTasksByPriority(priority: Task["priority"]): Task[] {
    return this.getTasks().filter((task) => task.priority === priority);
  }

  static searchTasks(query: string): Task[] {
    const tasks = this.getTasks();
    const lowercaseQuery = query.toLowerCase();

    return tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(lowercaseQuery) ||
        task.description?.toLowerCase().includes(lowercaseQuery) ||
        task.tags?.some((tag) => tag.toLowerCase().includes(lowercaseQuery)),
    );
  }

  static clearAllTasks(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  static exportTasks(): string {
    return JSON.stringify(this.getTasks(), null, 2);
  }

  static importTasks(data: string): boolean {
    try {
      const tasks = JSON.parse(data);
      if (!Array.isArray(tasks)) return false;

      this.saveTasks(tasks);
      return true;
    } catch (error) {
      console.error("Error importing tasks:", error);
      return false;
    }
  }
}
