const crypto = require("crypto");
const { columns, priorities, editableFields } = require("../constants/board");
const { taskExamples } = require("../constants/examples");
import type { Task } from "../types";

class TaskService {
  private tasks: Map<string, Task>;

  constructor() {
    this.tasks = new Map(
      taskExamples.map((task) => [
        task.id,
        { ...task, updatedAt: new Date().toISOString() },
      ]),
    );
  }

  list() {
    return [...this.tasks.values()].sort(
      (first, second) =>
        first.status.localeCompare(second.status) ||
        first.position - second.position,
    );
  }

  get(id) {
    return this.tasks.get(id);
  }

  create(input) {
    const validationError = this.validateCreate(input);
    if (validationError) throw new Error(validationError);

    const status = columns.includes(input.status) ? input.status : "backlog";
    const task = {
      id: crypto.randomUUID(),
      title: input.title.trim(),
      description: input.description || "",
      priority: priorities.includes(input.priority) ? input.priority : "medium",
      assignee: input.assignee || "Unassigned",
      status,
      position: this.countByStatus(status),
      updatedAt: new Date().toISOString(),
    };
    this.tasks.set(task.id, task);
    return task;
  }

  update(id, input) {
    const task = this.get(id);
    if (!task) return null;

    const validationError = this.validateUpdate(input);
    if (validationError) throw new Error(validationError);

    const previousStatus = task.status;
    Object.assign(
      task,
      Object.fromEntries(
        Object.entries(input).filter(([key]) => editableFields.includes(key)),
      ),
    );
    task.updatedAt = new Date().toISOString();
    if (previousStatus !== task.status) this.normalize(previousStatus);
    this.normalize(task.status);
    return task;
  }

  remove(id) {
    const task = this.get(id);
    if (!task) return null;
    this.tasks.delete(id);
    this.normalize(task.status);
    return task;
  }

  countByStatus(status) {
    return [...this.tasks.values()].filter((task) => task.status === status)
      .length;
  }

  normalize(status) {
    [...this.tasks.values()]
      .filter((task) => task.status === status)
      .sort((first, second) => first.position - second.position)
      .forEach((task, index) => {
        task.position = index;
      });
  }

  validateCreate(input) {
    if (!input.title?.trim()) return "A title is required";
    if (input.title.length > 120) return "Title must be 120 characters or fewer";
    return null;
  }

  validateUpdate(input) {
    if (input.title !== undefined && !input.title.trim())
      return "Title is required";
    if (input.title !== undefined && input.title.length > 120)
      return "Title must be 120 characters or fewer";
    if (input.priority !== undefined && !priorities.includes(input.priority))
      return "Invalid priority";
    if (input.status !== undefined && !columns.includes(input.status))
      return "Invalid status";
    if (
      input.position !== undefined &&
      (!Number.isInteger(input.position) || input.position < 0)
    )
      return "Invalid position";
    return null;
  }
}

module.exports = { TaskService };
