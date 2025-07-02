import { useState, useCallback } from "react";
import { StorageService } from "@/lib/storage-service";
import { Task } from "@/components/ui/task-card";
import { EditableTask } from "@/components/ui/editable-task-card";

export function useEditableTasks() {
  const [editableTasks, setEditableTasks] = useState<EditableTask[]>([]);

  const loadTasks = useCallback(() => {
    const storedTasks = StorageService.getTasks();
    const editable = storedTasks.map((task) => ({
      ...task,
      isNew: false,
      isEditing: false,
    }));
    setEditableTasks(editable);
  }, []);

  const createNewTask = useCallback((title: string) => {
    const newTask: EditableTask = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title.trim(),
      priority: "medium",
      status: "pending",
      tags: ["voice"],
      isNew: true,
      isEditing: true,
    };

    setEditableTasks((prev) => [newTask, ...prev]);
    return newTask;
  }, []);

  const saveTask = useCallback((taskId: string, newTitle: string) => {
    setEditableTasks((prev) =>
      prev.map((task) => {
        if (task.id === taskId) {
          if (task.isNew) {
            // Create new task in storage
            const savedTask = StorageService.addTask({
              title: newTitle,
              priority: task.priority,
              status: task.status,
              tags: task.tags || ["voice"],
            });

            return {
              ...savedTask,
              isNew: false,
              isEditing: false,
            };
          } else {
            // Update existing task
            StorageService.updateTask(taskId, { title: newTitle });
            return {
              ...task,
              title: newTitle,
              isEditing: false,
            };
          }
        }
        return task;
      }),
    );
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setEditableTasks((prev) => {
      const task = prev.find((t) => t.id === taskId);
      if (task && !task.isNew) {
        StorageService.deleteTask(taskId);
      }
      return prev.filter((t) => t.id !== taskId);
    });
  }, []);

  const markTaskDone = useCallback((taskId: string) => {
    setEditableTasks((prev) =>
      prev.map((task) => {
        if (task.id === taskId) {
          if (!task.isNew) {
            StorageService.updateTaskStatus(taskId, "completed");
          }
          return {
            ...task,
            status: "completed" as const,
          };
        }
        return task;
      }),
    );
  }, []);

  const cancelTask = useCallback((taskId: string) => {
    setEditableTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const editTask = useCallback((taskId: string) => {
    setEditableTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, isEditing: true } : task,
      ),
    );
  }, []);

  const getTaskNumber = useCallback(
    (taskId: string) => {
      const index = editableTasks.findIndex((task) => task.id === taskId);
      return index >= 0 ? index + 1 : 1;
    },
    [editableTasks],
  );

  const getTaskStats = useCallback(() => {
    const total = editableTasks.filter((task) => !task.isNew).length;
    const completed = editableTasks.filter(
      (task) => !task.isNew && task.status === "completed",
    ).length;
    const pending = total - completed;
    const newTasks = editableTasks.filter((task) => task.isNew).length;

    return { total, completed, pending, newTasks };
  }, [editableTasks]);

  return {
    editableTasks,
    loadTasks,
    createNewTask,
    saveTask,
    deleteTask,
    markTaskDone,
    cancelTask,
    editTask,
    getTaskNumber,
    getTaskStats,
  };
}
