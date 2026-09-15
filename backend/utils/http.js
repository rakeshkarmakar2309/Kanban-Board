function sendJson(response, status, value) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(value));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let value = "";
    request.on("data", (chunk) => {
      value += chunk;
      if (value.length > 1_000_000) reject(new Error("Request body is too large"));
    });
    request.on("end", () => {
      try {
        resolve(value ? JSON.parse(value) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    request.on("error", reject);
  });
}

module.exports = { sendJson, readJson };
