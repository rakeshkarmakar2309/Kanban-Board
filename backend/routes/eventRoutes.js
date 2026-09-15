function handleEventRoutes(request, response, eventService) {
  if (request.url === "/api/presence" && request.method === "GET") {
    response.writeHead(200, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    response.end(JSON.stringify(eventService.getActiveUsers()));
    return true;
  }
  if (request.url !== "/api/events" || request.method !== "GET") return false;
  response.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  response.write(": connected\n\n");
  eventService.addClient(response, request.userName || "Guest");
  return true;
}

module.exports = { handleEventRoutes };
