function handleEventRoutes(request, response, eventService) {
  if (request.url !== "/api/events" || request.method !== "GET") return false;
  response.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  response.write(": connected\n\n");
  eventService.addClient(response);
  return true;
}

module.exports = { handleEventRoutes };
