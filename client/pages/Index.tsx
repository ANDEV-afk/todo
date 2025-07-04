import { useState, useEffect } from "react";
import { Plus, Calendar } from "lucide-react";
import { TaskCard, Task, TaskStatus } from "@/components/ui/task-card";
import { EditableTaskCard } from "@/components/ui/editable-task-card";
import { AdvancedVoiceAssistant } from "@/components/ui/advanced-voice-assistant";
import { CommandInput } from "@/components/ui/command-input";
import { AppleNavbar } from "@/components/ui/apple-navbar";
import { StorageService } from "@/lib/storage-service";
import { SmartCommandProcessor } from "@/lib/smart-command-processor";
import { useEditableTasks } from "@/hooks/use-editable-tasks";
import { cn } from "@/lib/utils";

export default function Index() {
  const [filter, setFilter] = useState<"all" | TaskStatus>("all");
  const [view, setView] = useState<"grid" | "list">("grid");

  const {
    editableTasks,
    loadTasks,
    createNewTask,
    saveTask,
    deleteTask,
    markTaskDone,
    cancelTask,
    getTaskNumber,
    getTaskStats,
  } = useEditableTasks();

  // Load tasks from storage on component mount
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleStatusChange = (taskId: string, status: TaskStatus) => {
    if (status === "completed") {
      markTaskDone(taskId);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTask(taskId);
  };

  const handleTaskUpdate = () => {
    // Called by voice assistant when tasks are updated
    loadTasks();
  };

  const handleAddTask = () => {
    // Quick add task without voice
    createNewTask("New task");
  };

  const handleCommand = async (command: string) => {
    try {
      const result = SmartCommandProcessor.processCommand(command);

      if (result.success && result.createEditableTask && result.taskContent) {
        // Create immediate editable task card
        createNewTask(result.taskContent);
        console.log("Created editable task:", result.message);
      } else if (result.success) {
        loadTasks(); // Refresh for other operations
        console.log("Command executed:", result.message);
      } else {
        // The AdvancedVoiceAssistant component will handle confirmations
        console.log("Assistant response:", result.message);
      }
    } catch (error) {
      console.error("Error handling command:", error);
    }
  };

  const stats = getTaskStats();
  const filteredTasks = editableTasks.filter((task) => {
    if (filter === "all") return true;
    return task.status === filter;
  });

  const completedCount = stats.completed;
  const totalCount = stats.total;
  const pendingCount = stats.pending;

  return (
    <div className="min-h-screen relative">
      {/* Command Input */}
      <CommandInput
        onCommand={handleCommand}
        onTaskUpdate={handleTaskUpdate}
        onTaskCreate={createNewTask}
      />

      {/* Apple-style Navbar */}
      <AppleNavbar
        title="Good morning! 👋"
        subtitle={`You have ${pendingCount} tasks pending`}
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
                    {
                      editableTasks.filter(
                        (t) => !t.isNew && t.status === "in-progress",
                      ).length
                    }
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
            {filteredTasks.map((task) => {
              const taskNumber = getTaskNumber(task.id);

              // Show editable cards for new/editing tasks, regular cards for others
              if (task.isNew || task.isEditing) {
                return (
                  <EditableTaskCard
                    key={task.id}
                    task={task}
                    taskNumber={taskNumber}
                    onSave={saveTask}
                    onDelete={deleteTask}
                    onMarkDone={markTaskDone}
                    onCancel={cancelTask}
                  />
                );
              }

              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  taskNumber={taskNumber}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDeleteTask}
                  onEdit={(id) => console.log("Edit task:", id)}
                />
              );
            })}
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

      {/* Advanced Voice Assistant */}
      <AdvancedVoiceAssistant
        onTaskUpdate={handleTaskUpdate}
        onTaskCreate={createNewTask}
      />

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
