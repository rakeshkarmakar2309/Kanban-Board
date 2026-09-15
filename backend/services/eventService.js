class EventService {
  constructor() {
    this.clients = new Map();
    this.nextClientId = 1;
    this.heartbeat = setInterval(() => this.broadcastHeartbeat(), 15000);
    this.heartbeat.unref?.();
  }

  addClient(response, userName) {
    const client = {
      id: `client-${this.nextClientId++}`,
      userName: userName?.trim() || null,
      response,
    };
    this.clients.set(response, client);
    const removeClient = () => this.removeClient(response);
    response.once("close", removeClient);
    response.once("error", removeClient);
    this.sendTo(response, "connected", {
      clientId: client.id,
      userName: client.userName,
    });
    this.send("presence-updated", this.getActiveUsers());
    return client.id;
  }

  removeClient(response) {
    if (!this.clients.delete(response)) return;
    this.send("presence-updated", this.getActiveUsers());
  }

  send(event, payload) {
    const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    this.clients.forEach(({ response }) => {
      if (!response.writableEnded && !response.destroyed) response.write(message);
    });
  }

  sendTo(response, event, payload) {
    if (!response.writableEnded && !response.destroyed) {
      response.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
    }
  }

  broadcastHeartbeat() {
    this.clients.forEach(({ response }) => {
      if (!response.writableEnded && !response.destroyed) response.write(": heartbeat\n\n");
    });
  }

  getActiveUsers() {
    const users = new Map();
    this.clients.forEach(({ userName }) => {
      if (!userName) return;
      const key = userName.trim().toLowerCase();
      if (!users.has(key)) users.set(key, {
        name: userName,
        initials: userName.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
      });
    });
    return [...users.values()];
  }
}

module.exports = { EventService };
