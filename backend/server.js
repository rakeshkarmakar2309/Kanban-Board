const http = require("http");
const crypto = require("crypto");
const tasks = new Map();
const clients = new Set();
const columns = ["backlog", "todo", "in-progress", "done"];
const seed = [
  [
    "Map the onboarding flow",
    "Sketch the first-time user journey and note the moments that need the most clarity.",
    "high",
    "Maya Chen",
    "in-progress",
  ],
  [
    "Refine empty states",
    "Give each empty view a useful next step instead of a dead end.",
    "medium",
    "Theo Adams",
    "todo",
  ],
  [
    "Audit keyboard navigation",
    "Check focus order and accessible labels across the main workspace.",
    "low",
    "Maya Chen",
    "backlog",
  ],
  [
    "Ship activity timeline",
    "Connect the timeline to the latest task events and add a compact timestamp.",
    "high",
    "Jordan Lee",
    "done",
  ],
  [
    "Prepare release notes",
    "Summarize the improvements that are ready for the next release.",
    "medium",
    "Jordan Lee",
    "backlog",
  ],
];
seed.forEach(([title, description, priority, assignee, status], position) => {
  const id = `task-${position + 1}`;
  tasks.set(id, {
    id,
    title,
    description,
    priority,
    assignee,
    status,
    position: status === "backlog" ? (position === 4 ? 1 : 0) : 0,
    updatedAt: new Date().toISOString(),
  });
});
function json(res, status, value) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(value));
}
function emit(event, task) {
  clients.forEach((client) =>
    client.write(`event: ${event}\ndata: ${JSON.stringify(task)}\n\n`),
  );
}
function body(req) {
  return new Promise((resolve, reject) => {
    let value = "";
    req.on("data", (chunk) => {
      value += chunk;
    });
    req.on("end", () => {
      try {
        resolve(value ? JSON.parse(value) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}
function normalize(status) {
  [...tasks.values()]
    .filter((task) => task.status === status)
    .sort((a, b) => a.position - b.position)
    .forEach((task, index) => {
      task.position = index;
    });
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === "/api/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(": connected\n\n");
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }
  if (url.pathname === "/api/board" && req.method === "GET")
    return json(
      res,
      200,
      [...tasks.values()].sort(
        (a, b) => a.status.localeCompare(b.status) || a.position - b.position,
      ),
    );
  const match = url.pathname.match(/^\/api\/tasks(?:\/([^/]+))?$/);
  try {
    if (match && !match[1] && req.method === "POST") {
      const input = await body(req);
      if (!input.title?.trim())
        return json(res, 400, { error: "A title is required" });
      const status = columns.includes(input.status) ? input.status : "backlog";
      const task = {
        id: crypto.randomUUID(),
        title: input.title.trim(),
        description: input.description || "",
        priority: ["low", "medium", "high"].includes(input.priority)
          ? input.priority
          : "medium",
        assignee: input.assignee || "Unassigned",
        status,
        position: [...tasks.values()].filter((item) => item.status === status)
          .length,
        updatedAt: new Date().toISOString(),
      };
      tasks.set(task.id, task);
      emit("task-created", task);
      return json(res, 201, task);
    }
    if (match?.[1] && req.method === "PATCH") {
      const task = tasks.get(match[1]);
      if (!task) return json(res, 404, { error: "Task not found" });
      const input = await body(req);
      if (input.status !== undefined && !columns.includes(input.status))
        return json(res, 400, { error: "Invalid status" });
      if (
        input.position !== undefined &&
        (!Number.isInteger(input.position) || input.position < 0)
      )
        return json(res, 400, { error: "Invalid position" });
      const before = task.status;
      Object.assign(
        task,
        Object.fromEntries(
          Object.entries(input).filter(([key]) =>
            [
              "title",
              "description",
              "priority",
              "assignee",
              "status",
              "position",
            ].includes(key),
          ),
        ),
      );
      task.updatedAt = new Date().toISOString();
      if (before !== task.status) normalize(before);
      normalize(task.status);
      emit("task-updated", task);
      return json(res, 200, task);
    }
    if (match?.[1] && req.method === "DELETE") {
      const task = tasks.get(match[1]);
      if (!task) return json(res, 404, { error: "Task not found" });
      tasks.delete(task.id);
      normalize(task.status);
      emit("task-deleted", task);
      return json(res, 200, { id: task.id });
    }
  } catch (error) {
    return json(res, 400, { error: error.message });
  }
  if (url.pathname.startsWith("/api/"))
    return json(res, 404, { error: "Route not found" });
  res.writeHead(404);
  res.end("Use the Vite frontend at http://localhost:5173");
});
server.listen(process.env.PORT || 3000, () =>
  console.log("API listening on http://localhost:3000"),
);
