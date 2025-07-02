import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Filter, Calendar, User, Settings, Bell } from "lucide-react";
import { TaskCard, Task, TaskStatus } from "@/components/ui/task-card";
import { VoiceAssistant } from "@/components/ui/voice-assistant";
import { CommandInput } from "@/components/ui/command-input";
import { StorageService } from "@/lib/storage-service";
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Command Input */}
      <CommandInput onCommand={handleCommand} />

      {/* Header */}
      <header className="relative z-30 pt-20 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Good morning! 👋
              </h1>
              <p className="text-lg text-muted-foreground">
                You have{" "}
                <span className="font-semibold text-primary">
                  {tasks.length - completedCount}
                </span>{" "}
                tasks pending
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <button className="w-10 h-10 rounded-full glass flex items-center justify-center hover:glass-strong transition-all">
                <Bell className="w-5 h-5 text-foreground" />
              </button>
              <Link
                to="/settings"
                className="w-10 h-10 rounded-full glass flex items-center justify-center hover:glass-strong transition-all"
              >
                <Settings className="w-5 h-5 text-foreground" />
              </Link>
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-violet-500 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Tasks</p>
                  <p className="text-2xl font-bold text-foreground">
                    {totalCount}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-foreground">
                    {completedCount}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <span className="text-xl">✅</span>
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold text-foreground">
                    {tasks.filter((t) => t.status === "in-progress").length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <span className="text-xl">⚡</span>
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completion</p>
                  <p className="text-2xl font-bold text-foreground">
                    {Math.round((completedCount / totalCount) * 100)}%
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <span className="text-xl">📊</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setFilter("all")}
                className={cn(
                  "px-4 py-2 rounded-lg transition-all",
                  filter === "all"
                    ? "bg-primary text-primary-foreground"
                    : "glass hover:glass-strong",
                )}
              >
                All Tasks
              </button>
              <button
                onClick={() => setFilter("pending")}
                className={cn(
                  "px-4 py-2 rounded-lg transition-all",
                  filter === "pending"
                    ? "bg-primary text-primary-foreground"
                    : "glass hover:glass-strong",
                )}
              >
                Pending
              </button>
              <button
                onClick={() => setFilter("completed")}
                className={cn(
                  "px-4 py-2 rounded-lg transition-all",
                  filter === "completed"
                    ? "bg-primary text-primary-foreground"
                    : "glass hover:glass-strong",
                )}
              >
                Completed
              </button>
            </div>

            <button
              onClick={handleAddTask}
              className="glass hover:glass-strong px-4 py-2 rounded-lg flex items-center space-x-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          </div>
        </div>
      </header>

      {/* Task Grid */}
      <main className="px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <div className="glass rounded-2xl p-12 max-w-md mx-auto">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {filter === "completed"
                    ? "No completed tasks yet"
                    : "All caught up!"}
                </h3>
                <p className="text-muted-foreground">
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

      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-float" />
        <div
          className="absolute top-3/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "2s" }}
        />
      </div>
    </div>
  );
}
