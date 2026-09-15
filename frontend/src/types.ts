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

export interface TaskDraft {
  title: string;
  description: string;
  priority: Priority;
  assignee: string;
  status: TaskStatus;
}

export type ConnectionState = "connecting" | "live" | "reconnecting";
