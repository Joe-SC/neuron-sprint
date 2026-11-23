import { Match } from "./match.js";

export class Room {
  constructor() {
    /** @type {Map<string, {id:string, name:string, ws:WebSocket, host:boolean, ready:boolean}>} */
    this.players = new Map();
    this.match = null;
  }

  addClient(ws) {
    const id = crypto.randomUUID();
    const host = this.players.size === 0;
    const player = { id, name: `Player ${this.players.size + 1}`, ws, host, ready: false };
    this.players.set(id, player);

    this.send(ws, { type: "welcome", playerId: id, host });
    this.broadcastPlayers();

    ws.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      this.handleMessage(id, msg);
    });

    ws.on("close", () => {
      this.players.delete(id);
      // abort any running match
      if (this.match) {
        this.match.abort(`${player.name} disconnected`);
        this.match = null;
      }
      // promote next player to host if needed
      if (player.host && this.players.size > 0) {
        const next = this.players.values().next().value;
        next.host = true;
      }
      this.broadcastPlayers();
    });

    // reply pings
    ws.on("ping", () => ws.pong());
  }

  handleMessage(playerId, msg) {
    const player = this.players.get(playerId);
    if (!player) return;

    switch (msg.type) {
      case "rename": {
        const n = String(msg.name || "").trim().slice(0, 20);
        if (n) player.name = n;
        this.broadcastPlayers();
        break;
      }
      case "ready": {
        player.ready = !!msg.ready;
        this.broadcastPlayers();
        break;
      }
      case "startMatch": {
        if (!player.host) return;
        if (this.match) return; // match already running
        const config = msg.config || {};
        const mode = config.mode || "versus";
        const active = Array.from(this.players.values());

        if (mode === "versus" && active.length < 2) return;
        if (mode === "check" && active.length < 2) return;
        // solo: works with 1+ players (the host)

        this.match = new Match(this, active, config);
        this.match.start();
        // mark all ready false so they re-ready for next match
        for (const p of active) p.ready = false;
        this.broadcastPlayers();
        break;
      }
      case "answer": {
        if (this.match) this.match.onAnswer(playerId, msg);
        break;
      }
    }
  }

  broadcastPlayers() {
    const players = Array.from(this.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      host: p.host,
      ready: p.ready,
    }));
    this.broadcast({ type: "players", players, matchRunning: !!this.match });
  }

  /** Send JSON to one client. */
  send(ws, obj) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(obj));
    }
  }

  /** Send JSON to all clients. */
  broadcast(obj) {
    for (const p of this.players.values()) {
      this.send(p.ws, obj);
    }
  }

  /** Send to all EXCEPT a given player id. */
  broadcastExcept(exceptId, obj) {
    for (const p of this.players.values()) {
      if (p.id !== exceptId) this.send(p.ws, obj);
    }
  }
}