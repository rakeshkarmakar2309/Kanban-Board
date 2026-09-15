const http = require("http");
const { handleBoardRoutes } = require("./routes/boardRoutes");
const { handleEventRoutes } = require("./routes/eventRoutes");
const { handleTaskRoutes } = require("./routes/taskRoutes");
const { EventService } = require("./services/eventService");
const { TaskService } = require("./services/taskService");
const { sendJson } = require("./utils/http");

const port = process.env.PORT || 3000;
const taskService = new TaskService();
const eventService = new EventService();

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  request.url = url.pathname;

  if (handleEventRoutes(request, response, eventService)) return;
  if (handleBoardRoutes(request, response, taskService)) return;
  if (await handleTaskRoutes(request, response, taskService, eventService)) return;

  if (url.pathname.startsWith("/api/")) {
    sendJson(response, 404, { error: "Route not found" });
    return;
  }

  response.writeHead(404);
  response.end("Use the Vite frontend at http://localhost:5173");
});

server.listen(port, () =>
  console.log(`API listening on http://localhost:${port}`),
);
