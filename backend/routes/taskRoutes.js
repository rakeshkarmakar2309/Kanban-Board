const { sendJson, readJson } = require("../utils/http");

function handleTaskRoutes(request, response, taskService, eventService) {
  const match = request.url.match(/^\/api\/tasks(?:\/([^/]+))?$/);
  if (!match) return false;

  const taskId = match[1];
  if (!taskId && request.method === "POST") return createTask(request, response, taskService, eventService);
  if (taskId && request.method === "PATCH") return updateTask(request, response, taskService, eventService, taskId);
  if (taskId && request.method === "DELETE") return deleteTask(response, taskService, eventService, taskId);
  return false;
}

async function createTask(request, response, taskService, eventService) {
  try {
    const task = taskService.create(await readJson(request));
    eventService.send("task-created", task);
    sendJson(response, 201, task);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
  }
  return true;
}

async function updateTask(request, response, taskService, eventService, taskId) {
  try {
    const input = await readJson(request);
    const task = taskService.update(taskId, input);
    if (!task) return sendJson(response, 404, { error: "Task not found" });
    eventService.send("task-updated", task);
    sendJson(response, 200, task);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
  }
  return true;
}

function deleteTask(response, taskService, eventService, taskId) {
  const task = taskService.remove(taskId);
  if (!task) return sendJson(response, 404, { error: "Task not found" });
  eventService.send("task-deleted", task);
  sendJson(response, 200, { id: task.id });
  return true;
}

module.exports = { handleTaskRoutes };
