const { sendJson } = require("../utils/http");

function handleBoardRoutes(request, response, taskService) {
  if (request.url !== "/api/board" || request.method !== "GET") return false;
  sendJson(response, 200, taskService.list());
  return true;
}

module.exports = { handleBoardRoutes };
