import { useState, useEffect } from "react";
import { Plus, Calendar } from "lucide-react";
import { TaskCard, Task, TaskStatus } from "@/components/ui/task-card";
import { VoiceAssistant } from "@/components/ui/voice-assistant";
import { CommandInput } from "@/components/ui/command-input";
import { AppleNavbar } from "@/components/ui/apple-navbar";
import { StorageService } from "@/lib/storage-service";
import { VoiceCommandProcessor } from "@/lib/voice-command-processor";
import { cn } from "@/lib/utils";

export default function Index() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<"all" | TaskStatus>("all");
  const [view, setView] = useState<"grid" | "list">("grid");

  // Load tasks from storage on component mount
  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = () => {
    const storedTasks = StorageService.getTasks();

    // If no tasks exist, add some sample data
    if (storedTasks.length === 0) {
      const sampleTasks = [
        {
          title: "Try voice commands! 🎤",
          description:
            "Click the voice assistant and say 'Add task review the project'",
          priority: "high" as const,
          status: "pending" as const,
          tags: ["demo", "voice"],
        },
        {
          title: "Review quarterly report",
          description: "Go through Q3 financial data and prepare summary",
          priority: "high" as const,
          status: "pending" as const,
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
          tags: ["finance", "urgent"],
        },
        {
          title: "Team standup meeting",
          description: "Daily sync with the development team",
          priority: "medium" as const,
          status: "pending" as const,
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          tags: ["meeting", "team"],
        },
      ];

      sampleTasks.forEach((task) => StorageService.addTask(task));
    }

    setTasks(StorageService.getTasks());
  };

  const handleStatusChange = (taskId: string, status: TaskStatus) => {
    const success = StorageService.updateTaskStatus(taskId, status);
    if (success) {
      loadTasks(); // Reload from storage to stay in sync
    }
  };

  const handleDeleteTask = (taskId: string) => {
    const success = StorageService.deleteTask(taskId);
    if (success) {
      loadTasks(); // Reload from storage to stay in sync
    }
  };

  const handleTaskUpdate = () => {
    // Called by voice assistant when tasks are updated
    loadTasks();
  };

  const handleAddTask = () => {
    // Quick add task without voice
    const newTask: Omit<Task, "id"> = {
      title: "New task",
      priority: "medium",
      status: "pending",
      tags: ["manual"],
    };
    StorageService.addTask(newTask);
    loadTasks();
  };

  const handleCommand = (command: string) => {
    const lowerCommand = command.toLowerCase();

    if (
      lowerCommand.includes("add task") ||
      lowerCommand.includes("new task")
    ) {
      handleAddTask();
    } else if (
      lowerCommand.includes("complete") ||
      lowerCommand.includes("done")
    ) {
      // Mark first pending task as complete
      const pendingTasks = StorageService.getTasksByStatus("pending");
      if (pendingTasks.length > 0) {
        handleStatusChange(pendingTasks[0].id, "completed");
      }
    } else if (
      lowerCommand.includes("delete") ||
      lowerCommand.includes("remove")
    ) {
      // Delete most recent task
      const allTasks = StorageService.getTasks();
      if (allTasks.length > 0) {
        handleDeleteTask(allTasks[0].id);
      }
    }
  };

  const filteredTasks = tasks.filter((task) =>
    filter === "all" ? true : task.status === filter,
  );

  const completedCount = tasks.filter(
    (task) => task.status === "completed",
  ).length;
  const totalCount = tasks.length;

  return (
    <div className="min-h-screen relative">
      {/* Command Input */}
      <CommandInput onCommand={handleCommand} onTaskUpdate={handleTaskUpdate} />

      {/* Apple-style Navbar */}
      <AppleNavbar
        title="Good morning! 👋"
        subtitle={`You have ${tasks.length - completedCount} tasks pending`}
      />

      {/* Main Content */}
      <main className="pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            <div className="glass-thin rounded-2xl p-6 apple-card border border-border/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">
                    Total Tasks
                  </p>
                  <p className="text-3xl font-bold text-foreground font-display">
                    {totalCount}
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-info/20 flex items-center justify-center shadow-sm">
                  <Calendar className="w-7 h-7 text-info" />
                </div>
              </div>
            </div>

            <div className="glass-thin rounded-2xl p-6 apple-card border border-border/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">
                    Completed
                  </p>
                  <p className="text-3xl font-bold text-foreground font-display">
                    {completedCount}
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-success/20 flex items-center justify-center shadow-sm">
                  <span className="text-2xl">✅</span>
                </div>
              </div>
            </div>

            <div className="glass-thin rounded-2xl p-6 apple-card border border-border/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">
                    In Progress
                  </p>
                  <p className="text-3xl font-bold text-foreground font-display">
                    {tasks.filter((t) => t.status === "in-progress").length}
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-warning/20 flex items-center justify-center shadow-sm">
                  <span className="text-2xl">⚡</span>
                </div>
              </div>
            </div>

            <div className="glass-thin rounded-2xl p-6 apple-card border border-border/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">
                    Completion
                  </p>
                  <p className="text-3xl font-bold text-foreground font-display">
                    {Math.round((completedCount / totalCount) * 100)}%
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center shadow-sm">
                  <span className="text-2xl">📊</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setFilter("all")}
                className={cn(
                  "px-6 py-3 rounded-2xl transition-all duration-300 font-medium apple-button haptic-light",
                  filter === "all"
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "glass-thin hover:glass-regular border border-border/30",
                )}
              >
                All Tasks
              </button>
              <button
                onClick={() => setFilter("pending")}
                className={cn(
                  "px-6 py-3 rounded-2xl transition-all duration-300 font-medium apple-button haptic-light",
                  filter === "pending"
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "glass-thin hover:glass-regular border border-border/30",
                )}
              >
                Pending
              </button>
              <button
                onClick={() => setFilter("completed")}
                className={cn(
                  "px-6 py-3 rounded-2xl transition-all duration-300 font-medium apple-button haptic-light",
                  filter === "completed"
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "glass-thin hover:glass-regular border border-border/30",
                )}
              >
                Completed
              </button>
            </div>

            <button
              onClick={handleAddTask}
              className={cn(
                "px-6 py-3 rounded-2xl flex items-center space-x-2 transition-all duration-300",
                "bg-gradient-to-r from-primary to-accent text-white font-medium",
                "apple-button haptic-medium shadow-lg hover:shadow-xl fab",
              )}
            >
              <Plus className="w-5 h-5" />
              <span>Add Task</span>
            </button>
          </div>
          {/* Task Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onStatusChange={handleStatusChange}
                onDelete={handleDeleteTask}
                onEdit={(id) => console.log("Edit task:", id)}
              />
            ))}
          </div>

          {filteredTasks.length === 0 && (
            <div className="text-center py-20">
              <div className="glass-regular rounded-3xl p-16 max-w-md mx-auto border border-border/30 apple-card">
                <div className="text-8xl mb-6 animate-bounce-gentle">🎉</div>
                <h3 className="text-2xl font-bold text-foreground mb-3 font-display">
                  {filter === "completed"
                    ? "No completed tasks yet"
                    : "All caught up!"}
                </h3>
                <p className="text-muted-foreground text-lg">
                  {filter === "completed"
                    ? "Complete some tasks to see them here"
                    : "You have no pending tasks. Great job!"}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Voice Assistant */}
      <VoiceAssistant onTaskUpdate={handleTaskUpdate} />

      {/* Background Decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-primary/5 to-accent/5 rounded-full blur-3xl animate-float-gentle" />
        <div
          className="absolute top-3/4 right-1/4 w-[32rem] h-[32rem] bg-gradient-to-br from-info/5 to-success/5 rounded-full blur-3xl animate-float-gentle"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 w-80 h-80 bg-gradient-to-br from-accent/5 to-warning/5 rounded-full blur-3xl animate-float-gentle"
          style={{ animationDelay: "4s" }}
        />
      </div>
    </div>
  );
}
