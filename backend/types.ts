export type TaskStatus = "backlog" | "todo" | "in-progress" | "done";
export type Priority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  assignee: string;
  status: TaskStatus;
  position: number;
  updatedAt: string;
}

export interface TaskInput {
  title?: string;
  description?: string;
  priority?: Priority;
  assignee?: string;
  status?: TaskStatus;
  position?: number;
}
