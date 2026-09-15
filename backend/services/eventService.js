class EventService {
  constructor() {
    this.clients = new Set();
  }

  addClient(response) {
    this.clients.add(response);
    response.on("close", () => this.clients.delete(response));
  }

  send(event, payload) {
    const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    this.clients.forEach((client) => client.write(message));
  }
}

module.exports = { EventService };
